/**
 * @runwell/pidgie-core
 *
 * Customer-facing AI Pidgie agent for Business in a Box.
 *
 * @example
 * ```typescript
 * import { PidgieAgent } from '@runwell/pidgie-core';
 *
 * const agent = new PidgieAgent(businessData, {
 *   greeting: 'Welcome! How can I help you today?',
 * });
 *
 * const response = await agent.chat('What are your hours?', {
 *   sessionId: 'visitor-123',
 *   visitorId: 'anon-456',
 * });
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Business data types
  BusinessData,
  BusinessCategory,
  BusinessAddress,
  BusinessContact,
  BusinessHours,
  WeeklyHours,
  DayHours,
  SpecialHours,
  Service,
  FAQ,

  // Product types
  Product,
  ProductImage,
  ProductVariant,
  Promotion,

  // Booking types
  BookingConfig,
  BookingResource,
  BookingPolicies,
  AvailabilitySlot,

  // Configuration types
  PidgieConfig,
  DisambiguationStrategy,
  PidgiePersonality,
  PidgieFeatures,
  PidgieSecurityConfig,
  PidgieBranding,

  // Session types
  PidgieSession,
  PidgieMessage,
  PidgieContext,
  PidgieResponse,
  SuggestedAction,

  // Widget types
  PidgieWidgetConfig,
} from './types/index.js';

// =============================================================================
// Brand Registry
// =============================================================================

export type { BrandSlug, BrandSlugAll, BrandConfig, BrandRegistry } from './types/brand.js';
export { brandRegistry, getBrandConfig, isValidBrandSlug, getActiveBrandSlugs, getAllBrandSlugs } from './config/brand-utils.js';
export { generateWidgetTheme, generateWidgetThemes } from './config/brand-to-theme.js';
export type { GeneratedWidgetTheme } from './config/brand-to-theme.js';

// =============================================================================
// Agent
// =============================================================================

export { PidgieAgent, type PidgieAgentOptions } from './pidgie.agent.js';

// =============================================================================
// Tools
// =============================================================================

export {
  // Core tools
  businessInfoTool,
  businessHoursTool,
  servicesTool,
  faqsTool,

  // Product tools
  searchProductsTool,
  getProductDetailsTool,
  getPromotionsTool,

  // Booking tools
  checkAvailabilityTool,
  getBookingInfoTool,

  // Tool collections
  pidgieTools,
  productTools,
  bookingTools,

  // Write tool support
  isWriteTool,
  createWriteTool,
  PendingOperationsStore,
  type WriteTool,
  type WriteToolResult,
  type PendingWriteOperation,
  type WriteToolExecutor,
} from './tools/index.js';

// =============================================================================
// Widget
// =============================================================================

export {
  PidgieWidget,
  type PidgieWidgetProps,
  // Chat hook
  useChat,
  type ChatMessage as WidgetChatMessage,
  type UseChatOptions,
  type UseChatReturn,
  // Voice hook
  useVoiceRecorder,
  type UseVoiceRecorderOptions,
  type UseVoiceRecorderReturn,
  type VoiceRecorderState,
  // Voice button
  VoiceButton,
  type VoiceButtonProps,
} from './widget/index.js';

// =============================================================================
// Analytics
// =============================================================================

export {
  // Classes
  ConversationTracker,
  TopicExtractor,
  ConversationAnalytics,

  // Types
  type ConversationTrackerConfig,
  type ExtractedTopic,
  type AnalyticsSummary,
  type DailyStats,
  type ConversationLog,
  type MessageLog,
  type ConversationMetrics,

  // Constants
  TOPIC_CATEGORIES,
} from './analytics/index.js';

// =============================================================================
// Greeting
// =============================================================================

export {
  // Classes
  GreetingGenerator,

  // Helpers
  createQuickGreeting,

  // Types
  type GreetingContext,
  type GreetingSuggestion,
  type ProactiveGreeting,
  type TimeOfDay,
  type GreetingVariant,
  type GreetingGeneratorConfig,
} from './greeting/index.js';

// =============================================================================
// Security
// =============================================================================

export {
  // Security Headers
  generateSecurityHeaders,
  securityHeaders,
  securityHeadersMap,
  DEFAULT_SECURITY_HEADERS_CONFIG,
  type SecurityHeadersConfig,

  // CORS
  validateCORSOrigin,
  getCORSHeaders,
  createCORSPreflightResponse,
  createCORSValidator,
  DEFAULT_CORS_CONFIG,
  type CORSConfig,
} from './security/index.js';

// =============================================================================
// Session Management
// =============================================================================

export {
  // Classes
  SessionStore,
  MemorySessionAdapter,

  // Factory functions
  createSessionStore,
  createMemoryAdapter,

  // Types
  type SessionData,
  type ChatMessage,
  type SessionAdapter,
  type SessionStoreConfig,
  type SessionStats,
  type CreateSessionOptions,
  type CustomerProfile,
  type UTMParams,
} from './session/index.js';

// =============================================================================
// SSE Streaming
// =============================================================================

export {
  // Encoding utilities
  encodeSSE,
  encodeTextChunk,
  encodeDone,
  encodeError,
  encodeToolCall,
  encodeToolResult,
  encodeKeepAlive,

  // Stream creation
  createSSEStream,
  createSSEResponse,
  createTextStream,
  createSSEWriter,
  createSSEHeaders,

  // Constants
  SSE_HEADERS,

  // Types
  type SSEEventType,
  type SSEEvent,
  type SSETextEvent,
  type SSEDoneEvent,
  type SSEErrorEvent,
  type SSEToolCallEvent,
  type SSEToolResultEvent,
  type SSETranscriptionEvent,
  type SSEEventUnion,
  type SSEStreamOptions,
} from './streaming/index.js';

// =============================================================================
// Caching Layer
// =============================================================================

export {
  // Manager
  CacheManager,
  createCacheManager,

  // Stores
  MemoryCacheStore,
  createMemoryCacheStore,

  // Utilities
  hashContent,
  quickHash,
  normalizeUrl,
  checkFreshness,
  needsFreshnessCheck,
  isExpired,

  // Types
  type CacheEntry,
  type CacheStore,
  type CacheConfig,
  type CacheLookupResult,
  type FreshnessResult,
  type FreshnessChecker,
  type FreshnessCheckOptions,
} from './cache/index.js';

// =============================================================================
// Voice (Transcription)
// =============================================================================

export type {
  // Core types
  TranscriptionResult,
  TranscriberOptions,
  AudioValidationConfig,
  AudioValidationResult,
  AudioValidationErrorCode,
  AudioFormat,

  // Transcriber types
  TranscriberAdapter,
  WhisperTranscriberConfig,
  TranscriptionError,
  TranscriptionErrorCode,

  // Handler types
  VoiceHandlerOptions,
  VoiceHandlerResult,
} from './voice/index.js';

// =============================================================================
// DataSource (Dynamic Data Fetching)
// =============================================================================

export {
  // Static implementation
  createStaticDataSource,

  // Types
  type DataSource,
  type StaticDataSource,
  type ProductFilters,
  type SearchResult,
  type InventoryLevel,
  type Cart,
  type CartItem,
  type OrderInfo,
} from './datasource/index.js';

// =============================================================================
// Business Detection
// =============================================================================

export {
  // Main detection function
  detectBusinessSignals,

  // Contact extraction
  extractContactMethods,

  // Individual detectors
  detectProducts,
  detectServices,
  detectPricing,
  detectBooking,
  detectCaseStudies,
  detectTeamPage,
  detectFAQ,
  detectBlog,
  detectBusinessType,
  extractPrimaryOfferings,
  extractIndustryKeywords,
  calculateConfidence,

  // Helpers
  createDefaultSignals,
  getDefaultTone,

  // Patterns
  DETECTION_PATTERNS,

  // Types
  type BusinessSignals,
  type BusinessType,
  type ContactMethods,
  type Tone,
  type ScrapedPageInput,
  type DetectionPatterns,
} from './detection/index.js';

// =============================================================================
// Web Scraper
// =============================================================================

export {
  // Main function
  scrapeWebsite,

  // URL utilities
  normalizeUrl as normalizeScraperUrl,
  resolveUrl,
  isExternalUrl,
  shouldSkipUrl,
  isValuableExternalDomain,
  getDomain,

  // Content utilities
  hashContent as scraperHashContent,
  extractBusinessName,
  buildCombinedContent,

  // Constants
  DEFAULT_OPTIONS as SCRAPER_DEFAULT_OPTIONS,
  VALUABLE_EXTERNAL_DOMAINS,
  SKIP_EXTENSIONS,
  SKIP_PATHS,
  SKIP_DOMAINS,

  // Types
  type ScraperOptions,
  type ScrapedPage,
  type ScrapedWebsite,
  type ProgressCallback,
} from './scraper/index.js';

// =============================================================================
// Screenshot Capture
// =============================================================================

export {
  captureScreenshots,
  closeBrowser,
  isBrowserConnected,
  configureScreenshot,
  type ScreenshotResult,
  type ScreenshotOptions,
  type Viewport,
  type ScreenshotConfig,
} from './screenshot/index.js';

// =============================================================================
// System Prompt Builder
// =============================================================================

export {
  buildSystemPrompt,
  buildSystemPromptLegacy,
  getToneInstructions,
  getBusinessTypeDescription,
  getProactiveToolGuidelines,
  type AgentConfig,
  type SystemPromptContext,
  type PromptBuilderOptions,
} from './prompt/index.js';
