// Types
export type {
  ChatCard,
  CardType,
  CardAvailability,
  CardVariant,
  ChatAction,
  ActionType,
  StructuredChatResponse,
  CardTheme,
  CardConfig,
} from './types.js';

// Parser
export { parseStructuredResponse, parseMigrationAwareResponse } from './parsers/index.js';

// Components
export { CardRenderer, CardList, CardImage, ActionPills, SharedPanel, PanelItemRenderer, AgentProgressCard, ActionPill, MessagePill, PillContainer, AssessmentSummaryCard, PillarDetailCard, GapRecommendationCard } from './components/index.js';
export type { ProgressData, AssessmentSummaryData, PillarDetailData, GapRecommendationData } from './components/index.js';

// Hooks
export { usePanel, usePanelExport } from './hooks/index.js';
export type { PanelItem, UsePanelReturn } from './hooks/index.js';

// Utils
export {
  getStalenessLabel,
  DEFAULT_CARD_CONFIG,
  DEFAULT_CARD_THEME,
  downloadBlob,
  downloadImageUrl,
  copyToClipboard,
  formatPanelItem,
  getPanelItemFilename,
  hasDownloadableImage,
  getImageUrl,
  hasDownloadableHtml,
  getHtmlContent,
} from './utils/index.js';

// Validation
export {
  buildCardFromDB,
  buildCardsFromDB,
  registerCardMapper,
  validateRecordId,
  validateActionPayload,
  toCardRenderedEvent,
  toCardDroppedEvent,
  getDemoPills,
  getAgentPhases,
  getDefaultActionPillTheme,
  getDefaultMessagePillTheme,
  DEFAULT_AGENT_CARD_CONFIG,
  // Progressive emission
  createProgressiveEmitter,
  // Migration flag
  isCardToolMigrationEnabled,
  toMigrationFallbackEvent,
  MIGRATION_FALLBACK_EVENT,
  // Card chrome labels
  DEFAULT_CARD_LABELS,
  FR_CARD_LABELS,
  AR_CARD_LABELS,
  getCardLabels,
  interpolateLabel,
} from './validation/index.js';
export type {
  AgentCardType,
  ValidatedCard,
  CardValidationResult,
  CardDropReason,
  CardDropLog,
  CardRenderLog,
  CardMapper,
  CardQueryFn,
  CardValidationLogger,
  CardRenderedEvent,
  CardDroppedEvent,
  CardAnalyticsEvent,
  ActionPayload,
  ActionPayloadValidationResult,
  MigrationFallbackReason,
  MigrationFallbackEvent,
  ProgressiveCardEmitter,
  ProgressiveWriter,
  EmissionSummary,
  EmissionPerf,
  ProgressiveEmitterOptions,
  BusinessBreakdownLabels,
  CardChromeLabels,
  AllCardLabels,
} from './validation/index.js';
