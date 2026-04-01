/**
 * @runwell/bib-agent — Unified BIB Agent Framework
 *
 * Provides BibAgent base class (Phase 1), ToolRegistry, BibTool interface,
 * DataContext types, ResponsePipeline (Phase 2), and modules (Phase 3).
 *
 * Phase 0 exports: Tools (types, adapter, registry, 9 core tools)
 * Phase 1 exports: DataContext loader, SystemPromptBuilder, BibAgent class
 * Phase 2 exports: ResponsePipeline, PipelineSteps (6 steps)
 * Phase 3 exports: Modules (cards, panels, streaming, security)
 */

// ── Tools ────────────────────────────────────────────────────────────────────
export type { BibTool, BibToolContext, ToolParameter, ToolParameterSchema } from './tools/types.js';
export type { BibToolContextProvider } from './tools/adapter.js';
export type { CoreToolName } from './tools/registry.js';
export { toBibAgentTool } from './tools/adapter.js';
export { ToolRegistry, ToolNotFoundError, DuplicateToolError } from './tools/registry.js';

// Core tools
export {
  getBusinessInfoTool,
  getBusinessHoursTool,
  getServicesTool,
  getFaqsTool,
  getProductsTool,
  businessDataTools,
  fetchWebsiteTool,
  analyzeBrandTool,
  getBrandVoiceTool,
  brandTools,
  sanitizeContentTool,
  sanitizeContent,
  allCoreTools,
} from './tools/core/index.js';

// Extension tools
export { inventoryTrendsTool } from './tools/extensions/index.js';

// ── Agent ────────────────────────────────────────────────────────────────────
export { BibAgent, createEmptyDataContext } from './agent/index.js';
export type { BibAgentOptions, ToolResultEvent } from './agent/index.js';

// ── Context ─────────────────────────────────────────────────────────────────
export type {
  DataContext,
  DataContextMeta,
  BusinessCategory,
  BusinessAddress,
  SocialLinks,
  DayHours,
  WeeklyHours,
  Service,
  Product,
  FAQ,
  Promotion,
  BookingConfig,
  OrderingConfig,
  ScrapedWebsite,
  ScrapedPage,
  BrandVoice,
  BrandIdentity,
} from './context/types.js';
export { computeMeta } from './context/meta.js';
export { loadDataContext, TenantNotFoundError } from './context/context-loader.js';
export type { BusinessProfile, BusinessProfileSignals, ExtractedMetadata } from './context/business-profile.js';
export { buildBusinessProfile, parseBusinessProfile, extractMetadataFromSignals, resolveBusinessContext } from './context/business-profile.js';

// ── Prompt ──────────────────────────────────────────────────────────────────
export { buildBibSystemPrompt, serializeDataContext } from './prompt/system-prompt-builder.js';

// ── Intent Framework ─────────────────────────────────────────────────────────
export { IntentClassifier, ActionStateManager, ActionDispatcher } from './intent/index.js';
export type { ClassifiedIntent, ActionState, ActionResult, ContextInjection, IntentType } from './intent/index.js';

// ── Pipeline ──────────────────────────────────────────────────────────────────
export { ResponsePipeline } from './pipeline/response-pipeline.js';
export type { PipelineStep, PipelineContext, PipelineResult, PipelineFlag } from './pipeline/types.js';
export {
  FactGuard,
  VoiceEnforcer,
  DataIntegrityGuard,
  TemplateResolverStep,
  NumberGuardStep,
  UrlPolicyEnforcer,
  LanguageEnforcer,
} from './pipeline/steps/index.js';

// ── Modules ─────────────────────────────────────────────────────────────────
export type { BibAgentModule } from './modules/index.js';
export { CardsModule, PanelsModule, StreamingModule, SecurityModule } from './modules/index.js';
export type { CardMapper, PanelConfig, StreamingConfig, SecurityConfig } from './modules/index.js';
