/**
 * Factory for creating SSE streaming chat API route handlers.
 *
 * Each product provides its own session store and agent factory.
 * The handler manages: input validation, history, SSE streaming,
 * suggestion parsing, and error handling.
 */

import type { BaseDemoAgent, BaseChatMessage, ToolCallResult } from '../agent/index.js';
import { isPromptInjectionAttempt } from '@runwell/pidgie-core/security';
import { createLogger, logError } from '@runwell/logger';

const chatLogger = createLogger('chat-handler');
import type { ConversationLogger, ConversationMetadata } from '../logging/index.js';
import type { ChatCard, ChatAction, StructuredChatResponse } from '@runwell/card-system/types';
import { enforceUrlPolicy, enforceActionUrlPolicy } from '@runwell/card-system/parsers';
import { stripUnauthorizedUrls } from './url-policy.js';

/**
 * Async conversation persistence interface (Postgres-backed via @runwell/bot-memory).
 *
 * Define this interface here to avoid a hard dependency on bot-memory/pg.
 * The bot-memory ConversationStore satisfies this structurally.
 */
export interface ConversationPersistence {
  /**
   * Get existing or create new conversation for this session.
   * Returns the conversation ID.
   */
  getOrCreateConversation(
    visitorId: string,
    sessionId: string,
    sourceApp: string,
    metadata?: Record<string, unknown>
  ): Promise<string>;

  /**
   * Log a message to the conversation.
   */
  logMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    extras?: {
      toolCalls?: { name: string; args?: Record<string, unknown>; success?: boolean; resultSummary?: string; durationMs?: number }[];
      responseLatencyMs?: number;
      sentimentScore?: number;
    }
  ): Promise<void>;
}

export interface ChatHandlerSessionStore {
  readonly storeType?: undefined;
  get(id: string): { messages: BaseChatMessage[] } | null;
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    extras?: { cards?: ChatCard[]; actions?: ChatAction[] }
  ): void;
  getMessages(sessionId: string): BaseChatMessage[];
}

/** Adapter for session stores that use object-based addMessage */
export interface ChatHandlerSessionStoreAlt {
  readonly storeType: 'alt';
  get(id: string): { messages: BaseChatMessage[] } | null;
  addMessage(
    sessionId: string,
    message: { role: 'user' | 'assistant'; content: string; cards?: ChatCard[]; actions?: ChatAction[] }
  ): void;
  getMessages(sessionId: string): BaseChatMessage[];
}

export interface CreateChatHandlerOptions {
  sessionStore: ChatHandlerSessionStore | ChatHandlerSessionStoreAlt;
  createAgent: (session: unknown) => BaseDemoAgent;
  /** Legacy suggestion-only parser. Use `parseResponse` for card support. */
  parseSuggestions?: (text: string) => { cleanText: string; suggestions: string[] };
  /** Full structured response parser — extracts cards, actions, and suggestions. Takes precedence over parseSuggestions. */
  parseResponse?: (text: string) => StructuredChatResponse;
  /**
   * Migration-aware response parser — respects CARD_TOOL_MIGRATION flag.
   * When provided, takes precedence over parseResponse and parseSuggestions.
   * When flag ON: only extracts suggestions (cards come from DB via tools).
   * When flag OFF: full parseStructuredResponse behavior.
   */
  parseMigrationAware?: (text: string) => StructuredChatResponse;
  /** Max message length (default: 2000) */
  maxMessageLength?: number;
  /**
   * @deprecated Use `memoryStore` instead. SQLite-backed conversation logger.
   * When both `logger` and `memoryStore` are provided, `memoryStore` takes precedence.
   */
  logger?: ConversationLogger;
  /** Extract app-specific metadata from session for logging */
  extractMetadata?: (session: unknown) => Partial<ConversationMetadata>;
  /**
   * Async conversation persistence (Postgres-backed via @runwell/bot-memory).
   * Takes precedence over `logger` when provided.
   */
  memoryStore?: ConversationPersistence;
  /**
   * Extract visitor ID from request context (e.g., cookie or header set by visitor middleware).
   * Required when using `memoryStore`.
   */
  getVisitorId?: (request: Request) => string | null;
  /** Source app identifier for memoryStore conversations (e.g., 'shopimate-sales'). */
  sourceApp?: string;
  /**
   * Load a customer profile prompt block for the given visitor.
   * When provided, the block is appended to the agent's system prompt via setProfileBlock().
   * Returns null for new visitors with no profile.
   */
  getProfileBlock?: (visitorId: string) => Promise<string | null>;
  /** Allowed URL origins for card links/images. Relative URLs always pass. */
  allowedOrigins?: string[] | ((session: unknown) => string[]);
  /** Bot's own domain origins that should be kept in text responses. Merged with allowedOrigins for URL stripping. */
  botOrigins?: string[];
  /**
   * @deprecated Use `botOrigins` instead. When true (default), strips all URLs.
   * When false, disables stripping entirely. Ignored when `botOrigins` is set.
   */
  stripUrls?: boolean;
  /**
   * Optional hook called after each tool execution with enriched metadata.
   * Use this to wire attribution pipeline, event emission, or custom analytics.
   * Receives the full ToolCallResult plus conversation context.
   * Failures in this hook are caught silently and never break chat.
   */
  onToolResult?: (result: ToolCallResult, context: {
    tenantId?: string;
    conversationId?: string;
    visitorId?: string;
    sourceApp?: string;
  }) => void;
  /**
   * Optional sentiment scorer for real-time per-message scoring.
   * When provided, scores each user message and passes the score to memoryStore.
   * Must be a pure, synchronous function (e.g., VADER scorer from bot-analytics).
   */
  scoreSentiment?: (text: string) => { compound: number };
}

function encodeSSE(data: {
  type: string;
  content?: string;
  suggestions?: string[];
  cards?: ChatCard[];
  actions?: ChatAction[];
  visitorId?: string;
}): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function isAltStore(
  store: ChatHandlerSessionStore | ChatHandlerSessionStoreAlt
): store is ChatHandlerSessionStoreAlt {
  return (store as ChatHandlerSessionStoreAlt).storeType === 'alt';
}

function addMsg(
  store: ChatHandlerSessionStore | ChatHandlerSessionStoreAlt,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  extras?: { cards?: ChatCard[]; actions?: ChatAction[] }
) {
  if (isAltStore(store)) {
    store.addMessage(sessionId, { role, content, ...extras });
  } else {
    store.addMessage(sessionId, role, content, extras);
  }
}

export function createChatHandler(options: CreateChatHandlerOptions) {
  const {
    sessionStore,
    createAgent,
    parseSuggestions,
    parseResponse,
    parseMigrationAware,
    maxMessageLength = 2000,
    logger,
    extractMetadata,
    memoryStore,
    getVisitorId,
    sourceApp: sourceAppOption,
    getProfileBlock,
    allowedOrigins,
    botOrigins,
    stripUrls: stripUrlsOption = true,
    onToolResult: onToolResultHook,
    scoreSentiment: scoreSentimentFn,
  } = options;

  // In-memory rate limit for chat messages
  const chatRateMap = new Map<string, { count: number; resetAt: number }>();

  // Periodically clean expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of chatRateMap) {
      if (now > entry.resetAt) chatRateMap.delete(key);
    }
  }, 5 * 60_000).unref();

  function checkChatRateLimit(sid: string, maxPerMinute: number): boolean {
    const now = Date.now();
    const entry = chatRateMap.get(sid);
    if (!entry || now > entry.resetAt) {
      chatRateMap.set(sid, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= maxPerMinute) return false;
    entry.count++;
    return true;
  }

  return async function POST(request: Request): Promise<Response> {
    try {
      let body: Record<string, unknown>;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: 'Invalid JSON body' },
          { status: 400 }
        );
      }
      const { sessionId, message } = body;

      if (!sessionId || typeof sessionId !== 'string') {
        return Response.json(
          { error: 'Session ID is required' },
          { status: 400 }
        );
      }

      if (!message || typeof message !== 'string') {
        return Response.json(
          { error: 'Message is required' },
          { status: 400 }
        );
      }

      if (message.length > maxMessageLength) {
        return Response.json(
          { error: `Message too long (max ${maxMessageLength} characters)` },
          { status: 400 }
        );
      }

      const session = sessionStore.get(sessionId as string);
      if (!session) {
        return Response.json(
          { error: 'Session not found or expired' },
          { status: 404 }
        );
      }

      // Rate limit: 30 messages per minute per session
      if (!checkChatRateLimit(sessionId as string, 30)) {
        return Response.json(
          { error: 'Too many messages. Please slow down.' },
          { status: 429 }
        );
      }

      // Prompt injection detection
      if (isPromptInjectionAttempt(message)) {
        chatLogger.warn('Prompt injection attempt blocked', { sessionId });
        return Response.json(
          { error: 'Invalid request', code: 'PROMPT_INJECTION' },
          { status: 400 }
        );
      }

      // Add user message to history
      addMsg(sessionStore, sessionId, 'user', message);

      // Create agent from full session object
      const agent = createAgent(session as unknown as Record<string, unknown>);
      const history = sessionStore.getMessages(sessionId);

      // Logging: extract metadata and start/get conversation
      let convId = '';
      const visitorId = memoryStore && getVisitorId ? getVisitorId(request) : null;

      // Profile injection: append customer profile to system prompt
      if (getProfileBlock && visitorId) {
        try {
          const block = await getProfileBlock(visitorId);
          if (block) agent.setProfileBlock(block);
        } catch {
          // Profile injection failures must never break chat
        }
      }

      if (memoryStore && visitorId && sourceAppOption) {
        // Async Postgres path (bot-memory)
        try {
          const meta: Record<string, unknown> = extractMetadata
            ? extractMetadata(session as unknown as Record<string, unknown>)
            : {};
          convId = await memoryStore.getOrCreateConversation(
            visitorId, sessionId as string, sourceAppOption, meta
          );
          if (scoreSentimentFn) {
            const score = scoreSentimentFn(message as string).compound;
            await memoryStore.logMessage(convId, 'user', message as string, { sentimentScore: score });
          } else {
            await memoryStore.logMessage(convId, 'user', message as string);
          }
        } catch {
          // Logging failures must never break chat
        }
      } else if (logger) {
        // Legacy sync SQLite path
        try {
          const meta: Partial<ConversationMetadata> = extractMetadata
            ? extractMetadata(session as unknown as Record<string, unknown>)
            : {};
          convId = logger.getOrStartConversation(sessionId, meta as ConversationMetadata);
          logger.logUserMessage(convId, message);
        } catch {
          // Logging failures must never break chat
        }
      }

      // Create SSE stream
      const stream = new ReadableStream({
        async start(controller) {
          let closed = false;
          const safeEnqueue = (data: Uint8Array) => {
            if (closed) return;
            try { controller.enqueue(data); } catch { closed = true; }
          };
          const safeClose = () => {
            if (closed) return;
            closed = true;
            try { controller.close(); } catch { /* already closed */ }
          };

          const startTime = Date.now();
          try {
            let fullResponse = '';
            const historyWithoutCurrent = history.slice(0, -1);
            const toolCalls: ToolCallResult[] = [];

            // Emit visitor ID so the widget can store it for history lookups
            if (visitorId) {
              safeEnqueue(encodeSSE({ type: 'meta', visitorId }));
            }

            for await (const chunk of agent.chatStream(message, historyWithoutCurrent, (logger || memoryStore || onToolResultHook) ? {
              onToolResult: (result) => {
                toolCalls.push(result);
                if (onToolResultHook) {
                  try {
                    onToolResultHook(result, {
                      tenantId: sourceAppOption ? undefined : undefined,
                      conversationId: convId || undefined,
                      visitorId: visitorId || undefined,
                      sourceApp: sourceAppOption,
                    });
                  } catch {
                    // Attribution/analytics hook failures must never break chat
                  }
                }
              },
            } : undefined)) {
              fullResponse += chunk;
              safeEnqueue(encodeSSE({ type: 'text', content: chunk }));
            }

            // Parse structured response (cards + actions + suggestions)
            let parsed: StructuredChatResponse;
            if (parseMigrationAware) {
              parsed = parseMigrationAware(fullResponse);
            } else if (parseResponse) {
              parsed = parseResponse(fullResponse);
            } else if (parseSuggestions) {
              const { cleanText, suggestions } = parseSuggestions(fullResponse);
              parsed = { text: cleanText, suggestions, cards: [], actions: [] };
            } else {
              parsed = { text: fullResponse, suggestions: [], cards: [], actions: [] };
            }

            // Enforce URL policies
            const origins = typeof allowedOrigins === 'function'
              ? allowedOrigins(session)
              : allowedOrigins;
            if (origins && origins.length > 0) {
              if (parsed.cards) parsed.cards = enforceUrlPolicy(parsed.cards, origins);
              if (parsed.actions) parsed.actions = enforceActionUrlPolicy(parsed.actions, origins);
            }
            // Origin-aware URL stripping: keep URLs matching allowed/bot origins
            const allOrigins = [...(origins || []), ...(botOrigins || [])];
            if (allOrigins.length > 0) {
              parsed.text = stripUnauthorizedUrls(parsed.text, allOrigins);
            } else if (stripUrlsOption) {
              // Backward compat: no origins configured, strip all URLs
              parsed.text = stripUnauthorizedUrls(parsed.text);
            }

            // If parsing/policy stripped markup, send clean text replacement
            if (parsed.text !== fullResponse) {
              safeEnqueue(encodeSSE({ type: 'text_replace', content: parsed.text }));
            }

            addMsg(sessionStore, sessionId, 'assistant', parsed.text, {
              cards: parsed.cards?.length ? parsed.cards : undefined,
              actions: parsed.actions?.length ? parsed.actions : undefined,
            });

            // Log assistant message
            if (memoryStore && convId) {
              try {
                await memoryStore.logMessage(convId, 'assistant', parsed.text, {
                  toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                  responseLatencyMs: Date.now() - startTime,
                });
              } catch {
                // Logging failures must never break chat
              }
            } else if (logger && convId) {
              try {
                const latencyMs = Date.now() - startTime;
                logger.logAssistantMessage(
                  convId,
                  parsed.text,
                  latencyMs,
                  toolCalls.length > 0 ? toolCalls.map(t => t.name) : undefined
                );
              } catch {
                // Logging failures must never break chat
              }
            }

            // Emit cards (if any)
            if (parsed.cards && parsed.cards.length > 0) {
              safeEnqueue(encodeSSE({ type: 'cards', cards: parsed.cards }));
            }

            // Emit actions (if any)
            if (parsed.actions && parsed.actions.length > 0) {
              safeEnqueue(encodeSSE({ type: 'actions', actions: parsed.actions }));
            }

            // Emit suggestions (if any)
            if (parsed.suggestions && parsed.suggestions.length > 0) {
              safeEnqueue(encodeSSE({ type: 'suggestions', suggestions: parsed.suggestions }));
            }

            safeEnqueue(encodeSSE({ type: 'done' }));
            safeClose();
          } catch (error) {
            if (!closed) {
              chatLogger.error('Streaming error', logError(error));
            }

            // Log error
            if (memoryStore && convId) {
              try {
                await memoryStore.logMessage(convId, 'assistant', '[ERROR] Streaming failed', {
                  responseLatencyMs: Date.now() - startTime,
                });
              } catch {
                // Logging failures must never break chat
              }
            } else if (logger && convId) {
              try {
                const latencyMs = Date.now() - startTime;
                logger.logAssistantMessage(convId, '[ERROR] Streaming failed', latencyMs);
              } catch {
                // Logging failures must never break chat
              }
            }

            safeEnqueue(
              encodeSSE({ type: 'error', content: 'An error occurred while generating a response.' })
            );
            safeClose();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch (error) {
      chatLogger.error('Chat handler error', logError(error));
      return Response.json(
        { error: 'An error occurred.' },
        { status: 500 }
      );
    }
  };
}
