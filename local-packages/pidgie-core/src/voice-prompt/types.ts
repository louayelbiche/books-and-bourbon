/**
 * Deterministic Voice Prompt Engine - Types
 *
 * Every factual claim in a voice agent system prompt must trace to a DB field.
 * These types enforce that contract through the BlockRegistry + FactGuard pipeline.
 */

// ---------------------------------------------------------------------------
// Channel
// ---------------------------------------------------------------------------

export type PromptChannel = 'voice' | 'chat';

// ---------------------------------------------------------------------------
// Source traceability
// ---------------------------------------------------------------------------

/** Points to the exact DB record a piece of text came from. */
export interface SourceRef {
  table: string;   // e.g. 'Service', 'FAQ', 'Tenant'
  field: string;   // e.g. 'name', 'priceInCents', 'metadata.contact.phone'
  rowId: string;   // DB record ID
}

/** Maps one line of output to its DB sources. */
export interface AuditEntry {
  lineNumber: number;
  text: string;
  sources: SourceRef[];
  blockName: string;
}

// ---------------------------------------------------------------------------
// Block definitions
// ---------------------------------------------------------------------------

/** The text + source refs produced by formatting a single block. */
export interface BlockOutput {
  text: string;
  sources: SourceRef[];
}

/** Tenant metadata extracted from the JSON field (typed). */
export interface TenantMeta {
  category?: string;
  description?: string;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    socialMedia?: Record<string, string>;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    postalCode?: string;
    country?: string;
    formatted?: string;
  };
  customSystemPrompt?: string;
  leadQualQuestions?: string;
  [key: string]: unknown;
}

/** Caller context injected per-call (not cached with tenant data). */
export interface CallerContext {
  phone?: string;
  name?: string;
  status?: 'new' | 'returning';
}

/** A registered prompt block. */
export interface BlockDefinition {
  /** Unique block name. */
  name: string;
  /** Human description. */
  description: string;
  /** Sort order in the final prompt (lower = earlier). */
  order: number;
  /** Which DB tables/fields this block reads. */
  dbSources: Array<{ table: string; fields: string[] }>;
  /** Should this block be included for the given data? */
  condition: (data: BlockDataInput) => boolean;
  /** Voice channel formatter. */
  formatVoice: (data: BlockDataInput) => BlockOutput;
  /** Chat channel formatter. */
  formatChat: (data: BlockDataInput) => BlockOutput;
}

/** The complete data input available to every block. */
export interface BlockDataInput {
  tenantId: string;
  tenantName: string;
  meta: TenantMeta;
  services: ServiceData[];
  products: ProductData[];
  menuItems: MenuItemData[];
  faqs: FaqData[];
  hours: HoursData[];
  bookingConfig: BookingConfigData | null;
  caller: CallerContext | null;
}

// ---------------------------------------------------------------------------
// Flattened DB data (decoupled from Prisma models)
// ---------------------------------------------------------------------------

export interface ServiceData {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  durationMinutes: number;
}

export interface ProductData {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  tags: string[];
}

export interface MenuItemData {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  categoryName: string;
  allergens: string[];
}

export interface FaqData {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface HoursData {
  dayOfWeek: number; // 0=Sun, 6=Sat
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  isActive: boolean;
}

export interface BookingConfigData {
  timezone: string;
  autoConfirm: boolean;
  requirePhone: boolean;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
}

// ---------------------------------------------------------------------------
// Assembled prompt output
// ---------------------------------------------------------------------------

export interface AssembledPrompt {
  /** The complete prompt text. */
  text: string;
  /** Which blocks were included. */
  includedBlocks: string[];
  /** Which blocks were skipped (and why). */
  skippedBlocks: Array<{ name: string; reason: string }>;
  /** Full audit trail: every line traces to DB. */
  audit: AuditEntry[];
  /** FactGuard verification result. */
  verification: FactGuardResult;
  /** Tenant ID. */
  tenantId: string;
  /** Assembly timestamp. */
  assembledAt: Date;
}

// ---------------------------------------------------------------------------
// FactGuard
// ---------------------------------------------------------------------------

export type ViolationType =
  | 'price_mismatch'
  | 'hours_mismatch'
  | 'contact_mismatch'
  | 'name_not_found'
  | 'faq_mismatch'
  | 'unverified_number';

export interface FactViolation {
  type: ViolationType;
  location: { lineNumber: number; text: string };
  expected?: string;
  found: string;
}

export interface FactGuardResult {
  passed: boolean;
  violations: FactViolation[];
  checkedClaims: number;
  verifiedClaims: number;
}
