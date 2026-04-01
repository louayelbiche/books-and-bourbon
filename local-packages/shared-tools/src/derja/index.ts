/**
 * Tunisian Derja language module.
 *
 * Provides Derja vs MSA detection, NLLB-200 translation,
 * and prompt enhancement utilities for chatbot agents.
 */

// Types
export type {
  DerjaDialect,
  DerjaDetectionResult,
  TranslationRequest,
  TranslationResult,
  DerjaPromptConfig,
} from './types.js';

// Detection
export { detectDerja } from './detector.js';

// Translation
export { NLLBTranslator } from './translator.js';
export type { NLLBTranslatorOptions } from './translator.js';

// Prompt enhancement
export { getDerjaLanguageRules, enhancePromptWithDerja } from './prompt-enhancer.js';
