// Visitor identity and profiles
export type {
  VisitorType,
  VisitorIdentity,
  FactCategory,
  TaggedFact,
  VisitorProfile,
  CreateVisitorInput,
} from './visitor/types.js';
export { VisitorStore } from './visitor/visitor-store.js';
export { IdentityResolutionService } from './visitor/identity-resolution.js';
export type { ResolveIdentityInput, ResolveIdentityResult, MatchMethod } from './visitor/identity-resolution.js';
export type { CookieMiddlewareOptions, VisitorResult } from './visitor/cookie.js';
export { createVisitorCookieMiddleware } from './visitor/cookie.js';

// Conversation persistence and history
export type {
  ConversationRecord,
  MessageRecord,
  HistoryPage,
} from './conversation/types.js';
export { ConversationStore } from './conversation/store.js';
export { HistoryLoader } from './conversation/history.js';
export type { ConversationPersistence } from './conversation/adapter.js';
export { createPersistenceAdapter } from './conversation/adapter.js';

// Profile summarization and injection
export type {
  SummarizationInput,
  SummarizationResult,
  InjectionBlock,
} from './profile/types.js';
export type { LLMCallResult, ProfileSummarizerOptions } from './profile/summarizer.js';
export { ProfileSummarizer } from './profile/summarizer.js';
export { ProfileInjector } from './profile/injector.js';

// Migration
export { runMigration } from './migration/migrate.js';
