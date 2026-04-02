import {
  checkIframeAllowed,
  isBlockedUrl,
  sanitizeUrl
} from "../chunk-EGTKBZT3.js";

// src/api/url-policy.ts
function stripUnauthorizedUrls(text, allowedOrigins) {
  return text.replace(/(?:https?:\/\/|www\.)\S+/gi, (match) => {
    if (!allowedOrigins || allowedOrigins.length === 0) return "";
    try {
      const urlStr = match.startsWith("www.") ? `https://${match}` : match;
      const hostname = new URL(urlStr.replace(/[)}\].,;:!?]+$/, "")).hostname;
      if (allowedOrigins.some((o) => hostname === o || hostname.endsWith(`.${o}`))) {
        return match;
      }
    } catch {
    }
    return "";
  }).replace(/ {2,}/g, " ").replace(/\n /g, "\n").trim();
}
function stripTextUrls(text) {
  return stripUnauthorizedUrls(text);
}

// src/api/create-chat-handler.ts
import { isPromptInjectionAttempt } from "@runwell/pidgie-core/security";
import { createLogger, logError } from "@runwell/logger";
import { enforceUrlPolicy, enforceActionUrlPolicy } from "@runwell/card-system/parsers";
var chatLogger = createLogger("chat-handler");
function encodeSSE(data) {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify(data)}

`);
}
function isAltStore(store) {
  return store.storeType === "alt";
}
function addMsg(store, sessionId, role, content, extras) {
  if (isAltStore(store)) {
    store.addMessage(sessionId, { role, content, ...extras });
  } else {
    store.addMessage(sessionId, role, content, extras);
  }
}
function createChatHandler(options) {
  const {
    sessionStore,
    createAgent,
    parseSuggestions: parseSuggestions2,
    parseResponse,
    parseMigrationAware,
    maxMessageLength = 2e3,
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
    scoreSentiment: scoreSentimentFn
  } = options;
  const chatRateMap = /* @__PURE__ */ new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of chatRateMap) {
      if (now > entry.resetAt) chatRateMap.delete(key);
    }
  }, 5 * 6e4).unref();
  function checkChatRateLimit(sid, maxPerMinute) {
    const now = Date.now();
    const entry = chatRateMap.get(sid);
    if (!entry || now > entry.resetAt) {
      chatRateMap.set(sid, { count: 1, resetAt: now + 6e4 });
      return true;
    }
    if (entry.count >= maxPerMinute) return false;
    entry.count++;
    return true;
  }
  return async function POST(request) {
    try {
      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }
      const { sessionId, message } = body;
      if (!sessionId || typeof sessionId !== "string") {
        return Response.json(
          { error: "Session ID is required" },
          { status: 400 }
        );
      }
      if (!message || typeof message !== "string") {
        return Response.json(
          { error: "Message is required" },
          { status: 400 }
        );
      }
      if (message.length > maxMessageLength) {
        return Response.json(
          { error: `Message too long (max ${maxMessageLength} characters)` },
          { status: 400 }
        );
      }
      const session = sessionStore.get(sessionId);
      if (!session) {
        return Response.json(
          { error: "Session not found or expired" },
          { status: 404 }
        );
      }
      if (!checkChatRateLimit(sessionId, 30)) {
        return Response.json(
          { error: "Too many messages. Please slow down." },
          { status: 429 }
        );
      }
      if (isPromptInjectionAttempt(message)) {
        chatLogger.warn("Prompt injection attempt blocked", { sessionId });
        return Response.json(
          { error: "Invalid request", code: "PROMPT_INJECTION" },
          { status: 400 }
        );
      }
      addMsg(sessionStore, sessionId, "user", message);
      const agent = createAgent(session);
      const history = sessionStore.getMessages(sessionId);
      let convId = "";
      const visitorId = memoryStore && getVisitorId ? getVisitorId(request) : null;
      if (getProfileBlock && visitorId) {
        try {
          const block = await getProfileBlock(visitorId);
          if (block) agent.setProfileBlock(block);
        } catch {
        }
      }
      if (memoryStore && visitorId && sourceAppOption) {
        try {
          const meta = extractMetadata ? extractMetadata(session) : {};
          convId = await memoryStore.getOrCreateConversation(
            visitorId,
            sessionId,
            sourceAppOption,
            meta
          );
          if (scoreSentimentFn) {
            const score = scoreSentimentFn(message).compound;
            await memoryStore.logMessage(convId, "user", message, { sentimentScore: score });
          } else {
            await memoryStore.logMessage(convId, "user", message);
          }
        } catch {
        }
      } else if (logger) {
        try {
          const meta = extractMetadata ? extractMetadata(session) : {};
          convId = logger.getOrStartConversation(sessionId, meta);
          logger.logUserMessage(convId, message);
        } catch {
        }
      }
      const stream = new ReadableStream({
        async start(controller) {
          var _a, _b;
          let closed = false;
          const safeEnqueue = (data) => {
            if (closed) return;
            try {
              controller.enqueue(data);
            } catch {
              closed = true;
            }
          };
          const safeClose = () => {
            if (closed) return;
            closed = true;
            try {
              controller.close();
            } catch {
            }
          };
          const startTime = Date.now();
          try {
            let fullResponse = "";
            const historyWithoutCurrent = history.slice(0, -1);
            const toolCalls = [];
            if (visitorId) {
              safeEnqueue(encodeSSE({ type: "meta", visitorId }));
            }
            for await (const chunk of agent.chatStream(message, historyWithoutCurrent, logger || memoryStore || onToolResultHook ? {
              onToolResult: (result) => {
                toolCalls.push(result);
                if (onToolResultHook) {
                  try {
                    onToolResultHook(result, {
                      tenantId: sourceAppOption ? void 0 : void 0,
                      conversationId: convId || void 0,
                      visitorId: visitorId || void 0,
                      sourceApp: sourceAppOption
                    });
                  } catch {
                  }
                }
              }
            } : void 0)) {
              fullResponse += chunk;
              safeEnqueue(encodeSSE({ type: "text", content: chunk }));
            }
            let parsed;
            if (parseMigrationAware) {
              parsed = parseMigrationAware(fullResponse);
            } else if (parseResponse) {
              parsed = parseResponse(fullResponse);
            } else if (parseSuggestions2) {
              const { cleanText, suggestions } = parseSuggestions2(fullResponse);
              parsed = { text: cleanText, suggestions, cards: [], actions: [] };
            } else {
              parsed = { text: fullResponse, suggestions: [], cards: [], actions: [] };
            }
            const origins = typeof allowedOrigins === "function" ? allowedOrigins(session) : allowedOrigins;
            if (origins && origins.length > 0) {
              if (parsed.cards) parsed.cards = enforceUrlPolicy(parsed.cards, origins);
              if (parsed.actions) parsed.actions = enforceActionUrlPolicy(parsed.actions, origins);
            }
            const allOrigins = [...origins || [], ...botOrigins || []];
            if (allOrigins.length > 0) {
              parsed.text = stripUnauthorizedUrls(parsed.text, allOrigins);
            } else if (stripUrlsOption) {
              parsed.text = stripUnauthorizedUrls(parsed.text);
            }
            if (parsed.text !== fullResponse) {
              safeEnqueue(encodeSSE({ type: "text_replace", content: parsed.text }));
            }
            addMsg(sessionStore, sessionId, "assistant", parsed.text, {
              cards: ((_a = parsed.cards) == null ? void 0 : _a.length) ? parsed.cards : void 0,
              actions: ((_b = parsed.actions) == null ? void 0 : _b.length) ? parsed.actions : void 0
            });
            if (memoryStore && convId) {
              try {
                await memoryStore.logMessage(convId, "assistant", parsed.text, {
                  toolCalls: toolCalls.length > 0 ? toolCalls : void 0,
                  responseLatencyMs: Date.now() - startTime
                });
              } catch {
              }
            } else if (logger && convId) {
              try {
                const latencyMs = Date.now() - startTime;
                logger.logAssistantMessage(
                  convId,
                  parsed.text,
                  latencyMs,
                  toolCalls.length > 0 ? toolCalls.map((t) => t.name) : void 0
                );
              } catch {
              }
            }
            if (parsed.cards && parsed.cards.length > 0) {
              safeEnqueue(encodeSSE({ type: "cards", cards: parsed.cards }));
            }
            if (parsed.actions && parsed.actions.length > 0) {
              safeEnqueue(encodeSSE({ type: "actions", actions: parsed.actions }));
            }
            if (parsed.suggestions && parsed.suggestions.length > 0) {
              safeEnqueue(encodeSSE({ type: "suggestions", suggestions: parsed.suggestions }));
            }
            safeEnqueue(encodeSSE({ type: "done" }));
            safeClose();
          } catch (error) {
            if (!closed) {
              chatLogger.error("Streaming error", logError(error));
            }
            if (memoryStore && convId) {
              try {
                await memoryStore.logMessage(convId, "assistant", "[ERROR] Streaming failed", {
                  responseLatencyMs: Date.now() - startTime
                });
              } catch {
              }
            } else if (logger && convId) {
              try {
                const latencyMs = Date.now() - startTime;
                logger.logAssistantMessage(convId, "[ERROR] Streaming failed", latencyMs);
              } catch {
              }
            }
            safeEnqueue(
              encodeSSE({ type: "error", content: "An error occurred while generating a response." })
            );
            safeClose();
          }
        }
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive"
        }
      });
    } catch (error) {
      chatLogger.error("Chat handler error", logError(error));
      return Response.json(
        { error: "An error occurred." },
        { status: 500 }
      );
    }
  };
}

// src/api/index.ts
import { parseSuggestions } from "@runwell/pidgie-core/suggestions";
import { parseStructuredResponse } from "@runwell/card-system/parsers";

// src/api/create-voice-handler.ts
import {
  createWhisperTranscriber,
  handleVoiceRequest
} from "@runwell/pidgie-core/voice";
import { createLogger as createLogger2, logError as logError2 } from "@runwell/logger";
var voiceLogger = createLogger2("voice-handler");
var rateLimitMap = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 6e4).unref();
function checkRateLimit(sessionId, maxPerMinute) {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}
function createVoiceHandler(options) {
  const {
    sessionStore,
    maxSizeBytes = 10 * 1024 * 1024,
    timeout = 3e4,
    getLanguage,
    enableRateLimit = true,
    rateLimitPerMinute = 10
  } = options;
  return async function POST(request) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return Response.json(
          { error: "Voice transcription is not configured" },
          { status: 503 }
        );
      }
      let formData;
      try {
        formData = await request.formData();
      } catch {
        return Response.json(
          { error: "Invalid request: expected multipart/form-data" },
          { status: 400 }
        );
      }
      const audioFile = formData.get("audio");
      const sessionId = formData.get("sessionId");
      if (!sessionId || typeof sessionId !== "string") {
        return Response.json(
          { error: "Session ID is required" },
          { status: 400 }
        );
      }
      const session = sessionStore.get(sessionId);
      if (!session) {
        return Response.json(
          { error: "Session not found or expired" },
          { status: 404 }
        );
      }
      if (enableRateLimit && !checkRateLimit(sessionId, rateLimitPerMinute)) {
        return Response.json(
          { error: "Too many voice requests" },
          { status: 429 }
        );
      }
      const transcriber = createWhisperTranscriber({ apiKey, timeout });
      const language = getLanguage ? getLanguage(session) : void 0;
      const result = await handleVoiceRequest(audioFile, {
        transcriber,
        language,
        validation: { maxSizeBytes }
      });
      if (!result.success) {
        return Response.json(
          { error: result.error, code: result.code },
          { status: result.status }
        );
      }
      return Response.json({
        text: result.transcription.text,
        language: result.transcription.language,
        duration: result.transcription.duration
      });
    } catch (error) {
      voiceLogger.error("Voice handler error", logError2(error));
      return Response.json(
        { error: "Voice transcription failed" },
        { status: 500 }
      );
    }
  };
}

// src/api/create-session-handler.ts
function createSessionHandler(options) {
  const { sessionStore, serialize } = options;
  async function GET(request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");
    if (!sessionId) {
      return Response.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }
    const session = sessionStore.get(sessionId);
    if (!session) {
      return Response.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }
    return Response.json(serialize(session));
  }
  async function DELETE(request) {
    const origin = request.headers.get("origin");
    const expectedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
    if (origin && expectedOrigins.length > 0 && !expectedOrigins.includes(origin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");
    if (!sessionId) {
      return Response.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }
    const deleted = sessionStore.delete(sessionId);
    if (!deleted) {
      return Response.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }
    return Response.json({ success: true });
  }
  async function HEAD(request) {
    var _a, _b;
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken) {
      const authHeader = request.headers.get("authorization");
      if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
        return new Response(null, { status: 200 });
      }
    }
    const stats = ((_a = sessionStore.getStats) == null ? void 0 : _a.call(sessionStore)) ?? { totalSessions: 0, oldestSession: null };
    return new Response(null, {
      status: 200,
      headers: {
        "X-Total-Sessions": stats.totalSessions.toString(),
        "X-Oldest-Session": ((_b = stats.oldestSession) == null ? void 0 : _b.toISOString()) || "none"
      }
    });
  }
  return { GET, DELETE, HEAD };
}

// src/api/create-conversations-handler.ts
import { timingSafeEqual } from "crypto";
import { createLogger as createLogger3, logError as logError3 } from "@runwell/logger";
var convLogger = createLogger3("conversations-handler");
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function checkAuth(request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return Response.json({ error: "Admin API not configured" }, { status: 401 });
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !safeEqual(authHeader, `Bearer ${adminToken}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
function createConversationsHandler(options) {
  const { queryEngine } = options;
  async function GET(request) {
    const authError = checkAuth(request);
    if (authError) return authError;
    try {
      const url = new URL(request.url);
      const action = url.searchParams.get("action") || "list";
      switch (action) {
        case "list": {
          const result = queryEngine.list({
            limit: parseInt(url.searchParams.get("limit") || "50"),
            offset: parseInt(url.searchParams.get("offset") || "0"),
            sourceApp: url.searchParams.get("source") || void 0,
            domain: url.searchParams.get("domain") || void 0,
            dateFrom: url.searchParams.get("dateFrom") || void 0,
            dateTo: url.searchParams.get("dateTo") || void 0,
            locale: url.searchParams.get("locale") || void 0,
            minMessages: url.searchParams.get("minMessages") ? parseInt(url.searchParams.get("minMessages")) : void 0
          });
          return Response.json(result);
        }
        case "get": {
          const id = url.searchParams.get("id");
          if (!id) {
            return Response.json({ error: "id parameter required" }, { status: 400 });
          }
          const conv = queryEngine.getById(id);
          if (!conv) {
            return Response.json({ error: "Conversation not found" }, { status: 404 });
          }
          return Response.json(conv);
        }
        case "stats": {
          const stats = queryEngine.getStats({
            sourceApp: url.searchParams.get("source") || void 0,
            dateFrom: url.searchParams.get("dateFrom") || void 0,
            dateTo: url.searchParams.get("dateTo") || void 0
          });
          return Response.json(stats);
        }
        case "search": {
          const query = url.searchParams.get("q");
          if (!query) {
            return Response.json({ error: "q parameter required" }, { status: 400 });
          }
          const limit = parseInt(url.searchParams.get("limit") || "50");
          const results = queryEngine.searchMessages(query, limit);
          return Response.json({ results, count: results.length });
        }
        case "export": {
          const data = queryEngine.exportAll();
          return Response.json({ conversations: data, count: data.length });
        }
        default:
          return Response.json(
            { error: `Unknown action: ${action}`, validActions: ["list", "get", "stats", "search", "export"] },
            { status: 400 }
          );
      }
    } catch (error) {
      convLogger.error("Conversations handler error", logError3(error));
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }
  async function POST(request) {
    const authError = checkAuth(request);
    if (authError) return authError;
    try {
      const url = new URL(request.url);
      const action = url.searchParams.get("action") || "";
      switch (action) {
        case "cleanup": {
          const days = parseInt(url.searchParams.get("days") || "30");
          if (days < 1) {
            return Response.json({ error: "days must be >= 1" }, { status: 400 });
          }
          const deleted = queryEngine.deleteOlderThan(days);
          return Response.json({ deleted, olderThanDays: days });
        }
        default:
          return Response.json(
            { error: `Unknown action: ${action}`, validActions: ["cleanup"] },
            { status: 400 }
          );
      }
    } catch (error) {
      convLogger.error("Conversations handler error", logError3(error));
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }
  return { GET, POST };
}

// src/api/create-history-handler.ts
import { createLogger as createLogger4, logError as logError4 } from "@runwell/logger";
var historyLogger = createLogger4("history-handler");
function createHistoryHandler(options) {
  const { historyStore, validateAccess, sourceApp } = options;
  async function GET(request) {
    try {
      const visitorId = request.headers.get("x-visitor-id");
      if (!visitorId) {
        return Response.json(
          { error: "x-visitor-id header required" },
          { status: 400 }
        );
      }
      if (validateAccess) {
        const allowed = await validateAccess(request, visitorId);
        if (!allowed) {
          return Response.json({ error: "Access denied" }, { status: 403 });
        }
      }
      const url = new URL(request.url);
      const before = url.searchParams.get("before") || void 0;
      const limitParam = url.searchParams.get("limit");
      let limit = 20;
      if (limitParam) {
        const parsed = parseInt(limitParam, 10);
        if (isNaN(parsed) || parsed < 1) {
          return Response.json(
            { error: "limit must be a positive integer" },
            { status: 400 }
          );
        }
        limit = Math.min(parsed, 100);
      }
      const page = await historyStore.getHistory(visitorId, {
        before,
        limit,
        sourceApp
      });
      return Response.json(page);
    } catch (error) {
      historyLogger.error("History handler error", logError4(error));
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }
  return { GET };
}

// src/api/create-summarize-handler.ts
import { createLogger as createLogger5, logError as logError5 } from "@runwell/logger";
var summarizeLogger = createLogger5("summarize-handler");
function createSummarizeHandler(options) {
  const { resolveSession, summarize } = options;
  async function POST(request) {
    try {
      let sessionId;
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = await request.json();
        sessionId = body.sessionId;
      } else {
        const text = await request.text();
        try {
          const parsed = JSON.parse(text);
          sessionId = parsed.sessionId;
        } catch {
          sessionId = void 0;
        }
      }
      if (!sessionId) {
        return new Response(null, { status: 400 });
      }
      resolveSession(sessionId).then((result) => {
        if (result) {
          return summarize(result.visitorId, result.conversationId);
        }
      }).catch((err) => {
        summarizeLogger.error("Summarize trigger failed", logError5(err));
      });
      return new Response(null, { status: 202 });
    } catch (error) {
      summarizeLogger.error("Summarize handler error", logError5(error));
      return new Response(null, { status: 500 });
    }
  }
  return { POST };
}

// src/api/classify-scrape-error.ts
function classifyScrapeError(error) {
  if (!(error instanceof Error)) {
    return { code: "UNKNOWN", status: 500 };
  }
  const message = error.message || "";
  const cause = error.cause;
  const causeCode = (cause == null ? void 0 : cause.code) || "";
  const statusCode = error.statusCode;
  if (statusCode === 403) {
    return { code: "SITE_PROTECTED", status: 403 };
  }
  if (message.includes("ENOTFOUND") || message.includes("getaddrinfo") || causeCode === "ENOTFOUND") {
    return { code: "NOT_FOUND", status: 400 };
  }
  if (message.includes("ECONNREFUSED") || causeCode === "ECONNREFUSED") {
    return { code: "SITE_UNREACHABLE", status: 502 };
  }
  if (message.includes("ECONNRESET") || message.includes("EPIPE") || causeCode === "ECONNRESET") {
    return { code: "SITE_UNREACHABLE", status: 502 };
  }
  if (message.includes("timeout") || message.includes("TIMEOUT") || message.includes("ETIMEDOUT") || message.includes("AbortError") || causeCode === "ETIMEDOUT" || error.name === "AbortError" || error.name === "TimeoutError") {
    return { code: "TIMEOUT", status: 504 };
  }
  if (message.includes("CERT_") || message.includes("SSL") || message.includes("TLS") || message.includes("self-signed") || message.includes("UNABLE_TO_VERIFY") || message.includes("ERR_TLS") || causeCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || causeCode === "CERT_HAS_EXPIRED") {
    return { code: "SSL_ERROR", status: 502 };
  }
  if (message.startsWith("HTTP_")) {
    const statusMatch = message.match(/HTTP_(\d+)/);
    const httpStatus = statusMatch ? parseInt(statusMatch[1], 10) : 0;
    if (httpStatus >= 500) {
      return { code: "SITE_ERROR", status: 502 };
    }
    if (httpStatus === 404) {
      return { code: "SITE_NOT_FOUND", status: 400 };
    }
    return { code: "SITE_ERROR", status: 502 };
  }
  if (message.startsWith("NOT_HTML")) {
    return { code: "NOT_HTML", status: 400 };
  }
  return { code: "UNKNOWN", status: 500 };
}

// src/api/create-demo-chat-handler.ts
var rateBuckets = /* @__PURE__ */ new Map();
function checkRateLimit2(key, limit, windowMs) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}
if (typeof globalThis.setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateBuckets) {
      if (now > bucket.resetAt) rateBuckets.delete(key);
    }
  }, 6e4);
  if (timer && typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }
}
function toSSE(reply, suggestions = []) {
  const lines = [
    `data: ${JSON.stringify({ type: "text", content: reply })}`,
    ...suggestions.length > 0 ? [`data: ${JSON.stringify({ type: "suggestions", suggestions })}`] : [],
    `data: ${JSON.stringify({ type: "done" })}`,
    ""
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
function createDemoChatHandler(options) {
  const {
    bibUrl,
    rateLimit: limit = 30,
    rateWindowMs = 10 * 60 * 1e3,
    timeoutMs = 1e4
  } = options;
  return async function POST(request) {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenantId");
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { message, sessionId } = body;
    if (!message || !sessionId) {
      return Response.json({ error: "message and sessionId required" }, { status: 400 });
    }
    if (!bibUrl || !tenantId) {
      return Response.json({ error: "Demo routing not available" }, { status: 400 });
    }
    const rateKey = `demo-chat:${sessionId}`;
    if (!checkRateLimit2(rateKey, limit, rateWindowMs)) {
      return Response.json({ error: "Too many messages. Please wait a moment." }, { status: 429 });
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const bibResponse = await fetch(`${bibUrl}/api/public/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId: `demo-${sessionId}`,
          tenantId,
          channel: "website",
          contactName: "Website Visitor"
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!bibResponse.ok) {
        console.error("[DemoChat] BIB responded with", bibResponse.status);
        return toSSE("I am currently connecting to the demo system. Please try again in a moment.");
      }
      const contentType = bibResponse.headers.get("Content-Type") || "";
      const bibBody = bibResponse.body;
      if (!bibBody) {
        return toSSE("Sorry, I could not process that request. Please try again.");
      }
      if (contentType.includes("text/event-stream")) {
        return new Response(bibBody, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive"
          }
        });
      }
      const bibData = await bibResponse.json();
      const reply = bibData.reply || bibData.message || "I received your message.";
      const suggestions = bibData.suggestions || [];
      return toSSE(reply, suggestions);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort) console.error("[DemoChat] Proxy error:", err);
      return toSSE("I am currently connecting to the demo system. Please try again in a moment.");
    }
  };
}

// src/api/create-self-chat-handler.ts
var rateLimitMap2 = /* @__PURE__ */ new Map();
function checkRateLimit3(ip, limit) {
  const now = Date.now();
  const entry = rateLimitMap2.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap2.set(ip, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}
if (typeof globalThis.setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap2) {
      if (now > entry.resetAt) rateLimitMap2.delete(key);
    }
  }, 5 * 6e4);
  if (timer && typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }
}
function createSelfChatHandler(options) {
  const {
    bibUrl,
    tenantId,
    rateLimit: limit = 15,
    maxMessageLength = 2e3
  } = options;
  return async function POST(request) {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit3(ip, limit)) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { message, history = [] } = body;
    if (!message || typeof message !== "string" || message.length > maxMessageLength) {
      return Response.json({ error: "Invalid message" }, { status: 400 });
    }
    try {
      const bibRes = await fetch(bibUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId: ip,
          tenantId,
          channel: "website",
          contactName: "Website Visitor",
          history
        })
      });
      const data = await bibRes.json();
      const reply = data.reply || "I am temporarily unavailable.";
      const suggestions = data.suggestions || [];
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: reply })}

`));
          if (suggestions.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions })}

`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive"
        }
      });
    } catch (err) {
      console.error("[self-chat] BIB error:", err instanceof Error ? err.message : err);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "An error occurred" })}

`));
          controller.close();
        }
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
    }
  };
}
export {
  checkIframeAllowed,
  classifyScrapeError,
  createChatHandler,
  createConversationsHandler,
  createDemoChatHandler,
  createHistoryHandler,
  createSelfChatHandler,
  createSessionHandler,
  createSummarizeHandler,
  createVoiceHandler,
  isBlockedUrl,
  parseStructuredResponse,
  parseSuggestions,
  sanitizeUrl,
  stripTextUrls,
  stripUnauthorizedUrls,
  toSSE
};
//# sourceMappingURL=index.js.map