/**
 * Pidgie Agent Types
 *
 * Type definitions for the customer-facing Pidgie agent.
 */

/**
 * Business data provided to the Pidgie agent
 */
export interface BusinessData {
  /** Unique business identifier */
  id: string;
  /** Business name */
  name: string;
  /** Business description */
  description: string;
  /** Business category/type */
  category: BusinessCategory;
  /** Physical address */
  address?: BusinessAddress;
  /** Contact information */
  contact: BusinessContact;
  /** Operating hours */
  hours: BusinessHours;
  /** Services offered */
  services: Service[];
  /** Products (for retail/restaurant) */
  products?: Product[];
  /** Active promotions */
  promotions?: Promotion[];
  /** Booking configuration (for hotels/services) */
  booking?: BookingConfig;
  /** Frequently asked questions */
  faqs: FAQ[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Business categories
 */
export type BusinessCategory =
  | 'restaurant'
  | 'hotel'
  | 'retail'
  | 'service'
  | 'healthcare'
  | 'fitness'
  | 'salon'
  | 'other';

/**
 * Business address
 */
export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  /** Formatted display address */
  formatted?: string;
}

/**
 * Business contact information
 */
export interface BusinessContact {
  phone?: string;
  email?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

/**
 * Business operating hours
 */
export interface BusinessHours {
  /** Regular weekly hours */
  regular: WeeklyHours;
  /** Special hours (holidays, events) */
  special?: SpecialHours[];
  /** Timezone (e.g., 'America/New_York') */
  timezone: string;
}

/**
 * Weekly operating hours
 */
export interface WeeklyHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

/**
 * Hours for a single day
 */
export interface DayHours {
  /** Opening time (HH:MM format) */
  open: string;
  /** Closing time (HH:MM format) */
  close: string;
  /** Break periods (e.g., lunch break) */
  breaks?: Array<{ start: string; end: string }>;
}

/**
 * Special hours for specific dates
 */
export interface SpecialHours {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Name of the occasion */
  name?: string;
  /** Hours for this day, null if closed */
  hours: DayHours | null;
}

/**
 * Service offered by the business
 */
export interface Service {
  /** Service ID */
  id: string;
  /** Service name */
  name: string;
  /** Service description */
  description: string;
  /** Price (if applicable) */
  price?: {
    amount: number;
    currency: string;
    unit?: string; // e.g., 'per hour', 'per session'
  };
  /** Duration in minutes (if applicable) */
  duration?: number;
  /** Whether service is currently available */
  available: boolean;
  /** Category/group */
  category?: string;
}

/**
 * Frequently asked question
 */
export interface FAQ {
  /** Question ID */
  id: string;
  /** The question */
  question: string;
  /** The answer */
  answer: string;
  /** Category for grouping */
  category?: string;
  /** Keywords for matching */
  keywords?: string[];
}

/**
 * Product in the catalog
 */
export interface Product {
  /** Product ID */
  id: string;
  /** Product name */
  name: string;
  /** Product description */
  description: string;
  /** Category for filtering */
  category?: string;
  /** Subcategory for filtering */
  subcategory?: string;
  /** Price information (PUBLIC - no cost/margin) */
  price: {
    amount: number;
    currency: string;
    /** Compare at price (for showing discounts) */
    compareAt?: number;
  };
  /** Product images */
  images?: ProductImage[];
  /** Product variants (sizes, colors, etc.) */
  variants?: ProductVariant[];
  /** Product attributes */
  attributes?: Record<string, string>;
  /** Tags for searching */
  tags?: string[];
  /** Whether product is available */
  available: boolean;
  /** Stock status */
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  /** Featured product flag */
  featured?: boolean;
}

/**
 * Product image
 */
export interface ProductImage {
  url: string;
  alt?: string;
  primary?: boolean;
}

/**
 * Product variant
 */
export interface ProductVariant {
  id: string;
  name: string;
  price?: {
    amount: number;
    currency: string;
  };
  available: boolean;
  attributes?: Record<string, string>;
}

/**
 * Promotion/discount
 */
export interface Promotion {
  /** Promotion ID */
  id: string;
  /** Promotion name */
  name: string;
  /** Description */
  description: string;
  /** Discount type */
  type: 'percentage' | 'fixed' | 'bogo' | 'bundle';
  /** Discount value (percentage or fixed amount) */
  value?: number;
  /** Promo code (if applicable) */
  code?: string;
  /** Start date */
  startDate: string;
  /** End date */
  endDate: string;
  /** Applicable product/category IDs */
  applicableTo?: {
    products?: string[];
    categories?: string[];
  };
  /** Terms and conditions */
  terms?: string;
  /** Whether promotion is currently active */
  active: boolean;
}

/**
 * Booking configuration
 */
export interface BookingConfig {
  /** Whether booking is enabled */
  enabled: boolean;
  /** Booking type */
  type: 'appointment' | 'reservation' | 'room' | 'event';
  /** Minimum advance booking (hours) */
  minAdvance?: number;
  /** Maximum advance booking (days) */
  maxAdvance?: number;
  /** Booking slots/resources */
  resources?: BookingResource[];
  /** Policies */
  policies?: BookingPolicies;
}

/**
 * Bookable resource (table, room, staff member, etc.)
 */
export interface BookingResource {
  id: string;
  name: string;
  type: string;
  capacity?: number;
  description?: string;
  /** Price per booking (if applicable) */
  price?: {
    amount: number;
    currency: string;
    unit?: string;
  };
}

/**
 * Booking policies
 */
export interface BookingPolicies {
  /** Cancellation policy */
  cancellation?: string;
  /** Deposit required */
  depositRequired?: boolean;
  /** Deposit amount or percentage */
  depositAmount?: number;
  /** Payment terms */
  paymentTerms?: string;
  /** Additional rules */
  additionalRules?: string[];
}

/**
 * Availability slot
 */
export interface AvailabilitySlot {
  /** Start time (ISO string) */
  startTime: string;
  /** End time (ISO string) */
  endTime: string;
  /** Available capacity */
  available: number;
  /** Total capacity */
  total: number;
  /** Resource ID (if applicable) */
  resourceId?: string;
  /** Price for this slot (if varies) */
  price?: {
    amount: number;
    currency: string;
  };
}

/**
 * Pidgie agent configuration
 */
/**
 * Knowledge source configuration for RAG-powered responses.
 * When provided, the agent retrieves from chunked documents in addition
 * to (or instead of) structured business data tools.
 */
export interface KnowledgeSourceConfig {
  /** Path to SQLite knowledge database */
  knowledgeDbPath: string;
  /** Tenant ID within the knowledge DB */
  tenantId: string;
  /** Gemini API key for pre-search, query expansion, re-ranking */
  apiKey?: string;
  /** Regex: messages matching this trigger RAG pre-search */
  preSearchPattern?: RegExp;
  /** Regex patterns to skip RAG (greetings, chitchat) */
  skipPatterns?: RegExp[];
  /** Human-readable label for citations (e.g. "Internal Revenue Code", "Company Handbook") */
  corpusLabel?: string;
  /** Custom citation instruction appended to knowledge context */
  citationInstruction?: string;
  /** Custom query expansion prompt for the domain */
  expansionPrompt?: string;
  /** Custom follow-up rewrite prompt */
  rewritePrompt?: string;
  /** Custom re-ranking prompt */
  rerankPrompt?: string;
  /** Confidence gate threshold. Default: 0.3 */
  confidenceThreshold?: number;
  /** Max characters of context to inject. Default: 8000 */
  maxContextChars?: number;
  /** Max source chunks to include. Default: 5 */
  maxSourceChunks?: number;
  /** Max tool execution rounds per message. Default: 1 */
  maxToolRounds?: number;
  /** LLM temperature for knowledge queries. Default: 0.7 */
  temperature?: number;
  /** Max output tokens. Default: 1024 */
  maxOutputTokens?: number;
}

/**
 * Tool definition for RAG domain-specific tools.
 * These are custom tools registered by the consumer (e.g. submit_document, classify_document).
 */
export interface RagToolDefinition {
  declaration: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  };
  handler: (args: Record<string, unknown>) => Promise<string>;
}

/**
 * How the bot handles search results that return multiple matches.
 * - 'auto': LLM decides based on context (default, preserves current behavior).
 * - 'present_all': Always present all options; let the visitor choose.
 * - 'ask_clarify': Ask one clarifying question before showing results.
 */
export type DisambiguationStrategy = 'auto' | 'present_all' | 'ask_clarify';

export interface PidgieConfig {
  /** Custom greeting message */
  greeting?: string;
  /** Agent personality traits */
  personality?: PidgiePersonality;
  /** Features to enable/disable */
  features?: PidgieFeatures;
  /** Security configuration overrides */
  security?: PidgieSecurityConfig;
  /** Branding customization */
  branding?: PidgieBranding;
  /** Optional knowledge source for RAG-powered responses */
  knowledge?: KnowledgeSourceConfig;
  /** Custom system prompt override. When provided, replaces the auto-generated domain prompt. */
  customSystemPrompt?: string;
  /** How to handle multiple search results. Default: 'auto'. */
  disambiguationStrategy?: DisambiguationStrategy;
}

/**
 * Pidgie personality configuration
 */
export interface PidgiePersonality {
  /** Tone of voice */
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  /** Language style */
  language: 'concise' | 'detailed' | 'conversational';
  /** Use of emojis */
  useEmojis: boolean;
  /** Custom instructions for personality */
  customInstructions?: string;
}

/**
 * Feature toggles for Pidgie
 */
export interface PidgieFeatures {
  /** Enable service lookup */
  services: boolean;
  /** Enable FAQ lookup */
  faqs: boolean;
  /** Enable business hours lookup */
  hours: boolean;
  /** Enable booking/reservation suggestions */
  bookingSuggestions: boolean;
  /** Enable product search (if applicable) */
  productSearch: boolean;
}

/**
 * Security configuration for Pidgie
 */
export interface PidgieSecurityConfig {
  /** Maximum input length */
  maxInputLength?: number;
  /** Maximum messages per session */
  maxMessagesPerSession?: number;
  /** Rate limit per minute */
  rateLimitPerMinute?: number;
  /** Additional blocked patterns */
  blockedPatterns?: string[];
}

/**
 * Branding configuration
 */
export interface PidgieBranding {
  /** Primary color (hex) */
  primaryColor?: string;
  /** Agent avatar URL */
  avatarUrl?: string;
  /** Agent display name */
  displayName?: string;
}

/**
 * Conversation session data
 */
export interface PidgieSession {
  /** Session ID */
  id: string;
  /** Business ID */
  businessId: string;
  /** Visitor ID (anonymous identifier) */
  visitorId: string;
  /** Session start time */
  startedAt: Date;
  /** Last activity time */
  lastActivityAt: Date;
  /** Message count */
  messageCount: number;
  /** Detected topics discussed */
  topics: string[];
  /** User agent string */
  userAgent?: string;
  /** IP address (hashed for privacy) */
  ipHash?: string;
}

/**
 * Chat message in a conversation
 */
export interface PidgieMessage {
  /** Message ID */
  id: string;
  /** Session ID */
  sessionId: string;
  /** Role: user or assistant */
  role: 'user' | 'assistant';
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: Date;
  /** Tool calls made (assistant only) */
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
  /** Was this message blocked/filtered */
  blocked?: boolean;
  /** Block reason if blocked */
  blockReason?: string;
}

/**
 * Pidgie context passed to tools
 */
export interface PidgieContext {
  /** Session ID */
  sessionId: string;
  /** Visitor ID */
  visitorId: string;
  /** Business data */
  business: BusinessData;
  /** Current timestamp */
  timestamp: Date;
  /** User's timezone (if known) */
  userTimezone?: string;
  /** Tenant ID for DB-backed tools (place_order, etc.) */
  tenantId?: string;
  /** Prisma client for DB-backed tools (place_order, etc.) */
  prisma?: unknown;
}

/**
 * Response from the Pidgie agent
 */
export interface PidgieResponse {
  /** Response text */
  text: string;
  /** Whether the response was successful */
  success: boolean;
  /** Session ID */
  sessionId: string;
  /** Tools that were called */
  toolsUsed?: string[];
  /** Suggested follow-up actions */
  suggestedActions?: SuggestedAction[];
}

/**
 * Suggested action for the user
 */
export interface SuggestedAction {
  /** Action type */
  type: 'link' | 'button' | 'quick_reply';
  /** Display text */
  label: string;
  /** Action value (URL for link, message for quick_reply) */
  value: string;
}

/**
 * Widget configuration
 */
export interface PidgieWidgetConfig {
  /** API endpoint for chat */
  apiEndpoint: string;
  /** Business ID */
  businessId: string;
  /** Business name (for display) */
  businessName: string;
  /** Initial greeting message */
  greeting?: string;
  /** Widget position */
  position?: 'bottom-right' | 'bottom-left';
  /** Theme */
  theme?: 'light' | 'dark' | 'auto';
  /** Primary color */
  primaryColor?: string;
  /** Whether to show branding */
  showBranding?: boolean;
  /** Z-index for widget */
  zIndex?: number;
  /** Brand slug to auto-load colors, logo, avatar, footer from brand registry */
  brand?: string;
  /** Logo URL displayed in widget header */
  logoUrl?: string;
  /** Avatar URL displayed on bot messages */
  avatarUrl?: string;
  /** Custom footer text (e.g., "Powered by Pidgie"). Overrides brand default. */
  footerText?: string;
}

