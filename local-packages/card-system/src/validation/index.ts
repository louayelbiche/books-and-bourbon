/**
 * Card Validation Layer
 *
 * DB-only card data sourcing. Every card field comes from a database record.
 * The LLM decides WHEN and WHICH card to show. The DB decides WHAT it contains.
 */

export { buildCardFromDB, buildCardsFromDB, registerCardMapper } from './build-card.js';
export type { CardQueryFn, CardValidationLogger } from './build-card.js';
export { validateRecordId } from './validate-record-id.js';
export { validateActionPayload } from './validate-action-payload.js';
export { toCardRenderedEvent, toCardDroppedEvent } from './analytics.js';
export { DEFAULT_AGENT_CARD_CONFIG } from './config.js';
export { getDemoPills, getAgentPhases, getDefaultActionPillTheme, getDefaultMessagePillTheme } from './demo-pills.js';
export {
  getAgentCardConfig,
  CAMPAIGN_CARD_CONFIG,
  ENGAGEMENT_CARD_CONFIG,
  SOCIAL_CARD_CONFIG,
  PIDGIE_CARD_CONFIG,
  ADVISOR_CARD_CONFIG,
} from './agent-configs.js';
export {
  registerCampaignCardMappers,
  registerEngagementCardMappers,
  registerSocialCardMappers,
  registerBusinessBreakdownMapper,
  registerAdvisorCardMappers,
  registerAllAgentCardMappers,
} from './mappers/index.js';
export type {
  AgentCardType,
  ValidatedCard,
  CardValidationResult,
  CardDropReason,
  CardDropLog,
  CardRenderLog,
  CardMapper,
  CardRenderedEvent,
  CardDroppedEvent,
  CardAnalyticsEvent,
  ActionPayload,
  ActionPayloadValidationResult,
} from './types.js';
export type {
  AgentCardConfig,
  ActionPillTheme,
  PillTheme,
} from './config.js';

// Progressive emission
export { createProgressiveEmitter } from './progressive-emitter.js';
export type {
  ProgressiveCardEmitter,
  ProgressiveWriter,
  EmissionSummary,
  EmissionPerf,
  ProgressiveEmitterOptions,
} from './progressive-emitter.js';

// Migration feature flag
export {
  isCardToolMigrationEnabled,
  toMigrationFallbackEvent,
  MIGRATION_FALLBACK_EVENT,
} from './migration-flag.js';
export type {
  MigrationFallbackReason,
  MigrationFallbackEvent,
} from './migration-flag.js';

// Card chrome labels (i18n)
export {
  DEFAULT_CARD_LABELS,
  FR_CARD_LABELS,
  AR_CARD_LABELS,
  getCardLabels,
  interpolateLabel,
} from './card-labels.js';
export type {
  BusinessBreakdownLabels,
  CardChromeLabels,
  AllCardLabels,
} from './card-labels.js';

// Card type interfaces (per-agent)
export type {
  BrandProfileCard,
  BrandProfileCardData,
  RecipientTableCard,
  RecipientTableCardData,
  EmailPreviewCard,
  EmailPreviewCardData,
  CampaignSummaryCard,
  CampaignSummaryCardData,
  PersonaCard,
  PersonaCardData,
  SubjectLineCard,
  SubjectLineCardData,
  NewsletterPreviewCard,
  NewsletterPreviewCardData,
  SectionCard,
  SectionCardData,
  NewsletterSummaryCard,
  NewsletterSummaryCardData,
  BrandAnalysisCard,
  BrandAnalysisCardData,
  SocialPostCard,
  SocialPostCardData,
  LinkedInPreviewCard,
  LinkedInPreviewCardData,
  WeekOverviewCard,
  WeekOverviewCardData,
  BusinessBreakdownCard,
  BusinessBreakdownCardData,
  TypedValidatedCard,
} from './card-types/index.js';
