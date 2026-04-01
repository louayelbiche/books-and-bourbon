/**
 * Deterministic Voice Prompt Engine
 *
 * Every factual claim in a voice agent system prompt traces to a DB field.
 * Pipeline: BlockRegistry → PromptAssembler → FactGuard → AssembledPrompt
 */

// Core classes
export { BlockRegistry } from './block-registry';
export { PromptAssembler, parseTenantMeta } from './assembler';
export { FactGuard } from './fact-guard';
export { createDefaultRegistry } from './defaults';

// Types
export type {
  PromptChannel,
  SourceRef,
  AuditEntry,
  BlockOutput,
  BlockDefinition,
  BlockDataInput,
  TenantMeta,
  CallerContext,
  AssembledPrompt,
  FactGuardResult,
  FactViolation,
  ViolationType,
  ServiceData,
  ProductData,
  MenuItemData,
  FaqData,
  HoursData,
  BookingConfigData,
} from './types';

// Formatters
export { formatTime, formatPriceVoice, formatPriceChat, dayName } from './formatters/shared';

// Individual blocks (for testing / custom registries)
export { identityBlock } from './blocks/identity';
export { customInstructionsBlock } from './blocks/custom-instructions';
export { hoursBlock } from './blocks/hours';
export { servicesBlock } from './blocks/services';
export { productsBlock } from './blocks/products';
export { menuBlock } from './blocks/menu';
export { faqsBlock } from './blocks/faqs';
export { contactBlock } from './blocks/contact';
export { bookingBlock } from './blocks/booking';
export { leadQualificationBlock } from './blocks/lead-qualification';
export { callerBlock } from './blocks/caller';
export { callRulesBlock } from './blocks/call-rules';
