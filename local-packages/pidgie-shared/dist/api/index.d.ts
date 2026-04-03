export { checkIframeAllowed, isBlockedUrl, sanitizeUrl } from './ssrf.js';
import { BaseChatMessage, BaseDemoAgent, ToolCallResult } from '../agent/index.js';
import { ConversationLogger, ConversationMetadata, ConversationQueryEngine } from '../logging/index.js';
import { ChatCard, ChatAction, StructuredChatResponse } from '@runwell/card-system/types';
export { parseSuggestions } from '@runwell/pidgie-core/suggestions';
export { parseStructuredResponse } from '@runwell/card-system/parsers';
export { CreateScrapeHandlerOptions, ScrapeHandlerSession, ScrapeHandlerSessionStore } from './scrape.js';
import '@google/generative-ai';
import '@runwell/pidgie-core/scraper';

/**
 * URL Policy: origin-aware URL stripping for bot text responses.
 *
 * Bots can share URLs that match their allowed origins (the site they serve).
 * All other external URLs are stripped from text. URLs in card JSON are
 * handled separately by the card URL policy enforcer.
 */
/**
 * Strip URLs from text that don't match allowed origins.
 * URLs matching allowedOrigins are kept. All others are removed.
 * If no origins provided, all URLs are stripped (backward-compatible default).
 */
declare function stripUnauthorizedUrls(text: string, allowedOrigins?: string[]): string;
/**
 * @deprecated Use `stripUnauthorizedUrls()` instead for origin-aware stripping.
 * Strip ALL URLs from bot text responses.
 */
declare function stripTextUrls(text: string): string;

/**
 * Factory for creating SSE streaming chat API route handlers.
 *
 * Each product provides its own session store and agent factory.
 * The handler manages: input validation, history, SSE streaming,
 * suggestion parsing, and error handling.
 */

/**
 * Async conversation persistence interface (Postgres-backed via @runwell/bot-memory).
 *
 * Define this interface here to avoid a hard dependency on bot-memory/pg.
 * The bot-memory ConversationStore satisfies this structurally.
 */
interface ConversationPersistence {
    /**
     * Get existing or create new conversation for this session.
     * Returns the conversation ID.
     */
    getOrCreateConversation(visitorId: string, sessionId: string, sourceApp: string, metadata?: Record<string, unknown>): Promise<string>;
    /**
     * Log a message to the conversation.
     */
    logMessage(conversationId: string, role: 'user' | 'assistant', content: string, extras?: {
        toolCalls?: {
            name: string;
            args?: Record<string, unknown>;
            success?: boolean;
            resultSummary?: string;
            durationMs?: number;
        }[];
        responseLatencyMs?: number;
        sentimentScore?: number;
    }): Promise<void>;
}
interface ChatHandlerSessionStore {
    readonly storeType?: undefined;
    get(id: string): {
        messages: BaseChatMessage[];
    } | null;
    addMessage(sessionId: string, role: 'user' | 'assistant', content: string, extras?: {
        cards?: ChatCard[];
        actions?: ChatAction[];
    }): void;
    getMessages(sessionId: string): BaseChatMessage[];
}
/** Adapter for session stores that use object-based addMessage */
interface ChatHandlerSessionStoreAlt {
    readonly storeType: 'alt';
    get(id: string): {
        messages: BaseChatMessage[];
    } | null;
    addMessage(sessionId: string, message: {
        role: 'user' | 'assistant';
        content: string;
        cards?: ChatCard[];
        actions?: ChatAction[];
    }): void;
    getMessages(sessionId: string): BaseChatMessage[];
}
interface CreateChatHandlerOptions {
    sessionStore: ChatHandlerSessionStore | ChatHandlerSessionStoreAlt;
    createAgent: (session: unknown) => BaseDemoAgent;
    /** Legacy suggestion-only parser. Use `parseResponse` for card support. */
    parseSuggestions?: (text: string) => {
        cleanText: string;
        suggestions: string[];
    };
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
    scoreSentiment?: (text: string) => {
        compound: number;
    };
}
declare function createChatHandler(options: CreateChatHandlerOptions): (request: Request) => Promise<Response>;

/**
 * Factory for creating voice transcription API route handlers.
 *
 * Wraps pidgie-core voice utilities with session validation,
 * rate limiting, and configurable language detection.
 */
interface VoiceHandlerSessionStore {
    get(id: string): unknown | null;
}
interface CreateVoiceHandlerOptions {
    sessionStore: VoiceHandlerSessionStore;
    /** Max file size in bytes (default: 10MB) */
    maxSizeBytes?: number;
    /** Whisper timeout in ms (default: 30000) */
    timeout?: number;
    /**
     * Extract language hint from session.
     * Pidgie uses website.language; shopimate uses 'en'.
     */
    getLanguage?: (session: unknown) => string | undefined;
    /** Enable rate limiting per session (default: true) */
    enableRateLimit?: boolean;
    /** Rate limit: max requests per minute (default: 10) */
    rateLimitPerMinute?: number;
}
declare function createVoiceHandler(options: CreateVoiceHandlerOptions): (request: Request) => Promise<Response>;

/**
 * Factory for creating session management API route handlers.
 *
 * Provides GET (fetch session data) and DELETE (remove session).
 * Products customize the response shape via a serializer function.
 */
interface SessionHandlerSessionStore {
    get(id: string): unknown | null;
    delete(id: string): boolean;
    getStats?(): {
        totalSessions: number;
        oldestSession: Date | null;
    };
}
interface CreateSessionHandlerOptions {
    sessionStore: SessionHandlerSessionStore;
    /**
     * Serialize a session object into the JSON response body.
     * Each product defines what fields to expose.
     */
    serialize: (session: unknown) => Record<string, unknown>;
}
declare function createSessionHandler(options: CreateSessionHandlerOptions): {
    GET: (request: Request) => Promise<Response>;
    DELETE: (request: Request) => Promise<Response>;
    HEAD: (request: Request) => Promise<Response>;
};

/**
 * Factory for admin conversation query API route handlers.
 *
 * Auth: Bearer token from ADMIN_TOKEN env var.
 * GET actions via ?action= query param: list, get, stats, search, export.
 * POST actions via ?action= query param: cleanup (destructive).
 */

interface CreateConversationsHandlerOptions {
    queryEngine: ConversationQueryEngine;
}
declare function createConversationsHandler(options: CreateConversationsHandlerOptions): {
    GET: (request: Request) => Promise<Response>;
    POST: (request: Request) => Promise<Response>;
};

/**
 * Factory for paginated conversation history API route handlers.
 *
 * Returns a GET handler that serves visitor message history with
 * cursor-based pagination (before timestamp + limit).
 *
 * Like ConversationPersistence, this uses an interface so pidgie-shared
 * has no hard dependency on bot-memory or pg.
 */
/**
 * Portable history page shape returned by the handler.
 * Mirrors bot-memory's HistoryPage without importing it.
 */
interface HistoryMessage {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    toolCalls?: {
        name: string;
    }[];
    createdAt: Date | string;
}
interface HistoryPage {
    messages: HistoryMessage[];
    hasMore: boolean;
    oldestTimestamp: string | null;
}
/**
 * Interface for loading paginated history.
 * Implemented by bot-memory's HistoryLoader (via adapter) or any
 * compatible store.
 */
interface HistoryPersistence {
    getHistory(visitorId: string, options?: {
        before?: string;
        limit?: number;
        sourceApp?: string;
    }): Promise<HistoryPage>;
}
interface CreateHistoryHandlerOptions {
    /** History loader instance (e.g. from bot-memory's HistoryLoader). */
    historyStore: HistoryPersistence;
    /**
     * Optional access validation. Return true to allow, false to deny.
     * Use this to verify the requesting user owns the visitorId.
     */
    validateAccess?: (request: Request, visitorId: string) => boolean | Promise<boolean>;
    /** If set, only return history for this source app. */
    sourceApp?: string;
}
/**
 * Creates a GET handler that serves paginated conversation history.
 *
 * Query params:
 * - `limit` (optional, default 20, max 100)
 * - `before` (optional, ISO timestamp cursor for pagination)
 *
 * Visitor ID is read from the `x-visitor-id` header.
 *
 * Response: `{ messages, hasMore, oldestTimestamp }`
 */
declare function createHistoryHandler(options: CreateHistoryHandlerOptions): {
    GET: (request: Request) => Promise<Response>;
};

/**
 * Factory for summarization trigger API route.
 *
 * Accepts a POST from navigator.sendBeacon (tab close) or explicit call.
 * Looks up the conversation by sessionId, then triggers summarization
 * fire-and-forget. Returns 202 Accepted immediately.
 */
/**
 * Callback that triggers profile summarization for a conversation.
 * Should be fire-and-forget (caller does not await the result).
 */
type SummarizeTrigger = (visitorId: string, conversationId: string) => void | Promise<void>;
/**
 * Resolves a sessionId to its conversation and visitor IDs.
 * Returns null if the session has no associated conversation.
 */
type SessionResolver = (sessionId: string) => Promise<{
    visitorId: string;
    conversationId: string;
} | null>;
interface CreateSummarizeHandlerOptions {
    /** Resolves sessionId to visitorId + conversationId. */
    resolveSession: SessionResolver;
    /** Triggers summarization. Called fire-and-forget. */
    summarize: SummarizeTrigger;
}
/**
 * Creates a POST handler for summarization triggers.
 *
 * Body: `{ sessionId: string }` (sent via sendBeacon as text/plain or application/json)
 *
 * Returns 202 immediately; summarization runs in background.
 */
declare function createSummarizeHandler(options: CreateSummarizeHandlerOptions): {
    POST: (request: Request) => Promise<Response>;
};

/**
 * Classify scrape errors into user-facing error codes.
 *
 * Centralizes error pattern matching so all scrape routes
 * return consistent, specific error messages instead of generic "UNKNOWN".
 */
interface ScrapeErrorResult {
    code: string;
    status: number;
}
/**
 * Classify a scrape error into a specific error code and HTTP status.
 *
 * Error codes map to i18n keys in each app's locale files:
 * - `scrapeErrors.{CODE}` (shopimate-landing)
 * - `errors.scrape.{CODE}` (pidgie-demo)
 */
declare function classifyScrapeError(error: unknown): ScrapeErrorResult;

/**
 * Factory for creating demo-chat POST handlers.
 *
 * Proxies chat messages to BIB /api/public/chat with a demo tenant ID.
 * Converts BIB JSON responses to SSE format for the useChat hook.
 * Includes rate limiting, timeout protection, and graceful fallback.
 *
 * Usage:
 *   import { createDemoChatHandler } from '@runwell/pidgie-shared/api';
 *   export const POST = createDemoChatHandler({
 *     bibUrl: process.env.NEXT_PUBLIC_DEMO_BIB_URL,
 *   });
 */
interface CreateDemoChatHandlerOptions {
    /** BIB staging URL (e.g. https://dashboard-staging.runwellsystems.com) */
    bibUrl?: string;
    /** Max messages per session per window (default: 30) */
    rateLimit?: number;
    /** Rate limit window in ms (default: 10 minutes) */
    rateWindowMs?: number;
    /** Request timeout in ms (default: 10000) */
    timeoutMs?: number;
}
/**
 * Converts a text reply + optional suggestions into an SSE stream
 * compatible with the useChat hook's parser.
 */
declare function toSSE(reply: string, suggestions?: string[]): Response;
declare function createDemoChatHandler(options: CreateDemoChatHandlerOptions): (request: Request) => Promise<Response>;

/**
 * Factory for creating self-chat POST handlers.
 *
 * Proxies chat messages to BIB /api/public/chat with a fixed tenant ID
 * (the brand's own BIB tenant). Converts BIB JSON responses to SSE format.
 *
 * Usage:
 *   import { createSelfChatHandler } from '@runwell/pidgie-shared/api';
 *   export const POST = createSelfChatHandler({
 *     bibUrl: process.env.BIB_PUBLIC_CHAT_URL || 'http://host.docker.internal:9200/api/public/chat',
 *     tenantId: '633a5813-9468-4dc2-96c8-88ed7ccb3ab9',
 *   });
 */
interface CreateSelfChatHandlerOptions {
    /** BIB public chat URL (full path to /api/public/chat) */
    bibUrl: string;
    /** Fixed tenant ID for this brand's self-bot */
    tenantId: string;
    /** Max requests per IP per minute (default: 15) */
    rateLimit?: number;
    /** Max message length (default: 2000) */
    maxMessageLength?: number;
}
declare function createSelfChatHandler(options: CreateSelfChatHandlerOptions): (request: Request) => Promise<Response>;

export { type ChatHandlerSessionStore, type ChatHandlerSessionStoreAlt, ConversationLogger, ConversationMetadata, type ConversationPersistence, type CreateChatHandlerOptions, type CreateDemoChatHandlerOptions, type CreateHistoryHandlerOptions, type CreateSelfChatHandlerOptions, type CreateSessionHandlerOptions, type CreateSummarizeHandlerOptions, type CreateVoiceHandlerOptions, type HistoryMessage, type HistoryPage, type HistoryPersistence, type ScrapeErrorResult, type SessionHandlerSessionStore, type SessionResolver, type SummarizeTrigger, type VoiceHandlerSessionStore, classifyScrapeError, createChatHandler, createConversationsHandler, createDemoChatHandler, createHistoryHandler, createSelfChatHandler, createSessionHandler, createSummarizeHandler, createVoiceHandler, stripTextUrls, stripUnauthorizedUrls, toSSE };
