export { isBlockedUrl, sanitizeUrl, checkIframeAllowed } from './ssrf.js';
export { stripTextUrls, stripUnauthorizedUrls } from './url-policy.js';
export { createChatHandler } from './create-chat-handler.js';
export type { CreateChatHandlerOptions, ChatHandlerSessionStore, ChatHandlerSessionStoreAlt, ConversationPersistence } from './create-chat-handler.js';
export { parseSuggestions } from '@runwell/pidgie-core/suggestions';
export { parseStructuredResponse } from '@runwell/card-system/parsers';
export { createVoiceHandler } from './create-voice-handler.js';
export type { CreateVoiceHandlerOptions, VoiceHandlerSessionStore } from './create-voice-handler.js';
export { createSessionHandler } from './create-session-handler.js';
export type { CreateSessionHandlerOptions, SessionHandlerSessionStore } from './create-session-handler.js';

export { createConversationsHandler } from './create-conversations-handler.js';
export { createHistoryHandler } from './create-history-handler.js';
export type { CreateHistoryHandlerOptions, HistoryPersistence, HistoryPage, HistoryMessage } from './create-history-handler.js';
export { createSummarizeHandler } from './create-summarize-handler.js';
export type { CreateSummarizeHandlerOptions, SummarizeTrigger, SessionResolver } from './create-summarize-handler.js';
export { classifyScrapeError } from './classify-scrape-error.js';
export type { ScrapeErrorResult } from './classify-scrape-error.js';
export { createDemoChatHandler, toSSE } from './create-demo-chat-handler.js';
export type { CreateDemoChatHandlerOptions } from './create-demo-chat-handler.js';
export { createSelfChatHandler } from './create-self-chat-handler.js';
export type { CreateSelfChatHandlerOptions } from './create-self-chat-handler.js';
export type { ConversationLogger, ConversationMetadata } from '../logging/index.js';

// NOTE: createScrapeHandler is exported from '@runwell/pidgie-shared/api/scrape'
// It's separated because it imports Playwright (via pidgie-core/screenshot),
// which would contaminate the barrel and break webpack builds for routes
// that only need chat/session/voice handlers.
export type { CreateScrapeHandlerOptions, ScrapeHandlerSession, ScrapeHandlerSessionStore } from './create-scrape-handler.js';
