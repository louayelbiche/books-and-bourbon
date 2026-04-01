/**
 * Types for the Tunisian Derja language module.
 */

export type DerjaDialect = 'tn' | 'ar' | 'unknown';

export interface DerjaDetectionResult {
  dialect: DerjaDialect;
  confidence: number; // 0-1
  markers: string[]; // which Derja markers were found
}

export interface TranslationRequest {
  text: string;
  source: string; // FLORES-200 code (e.g. 'eng_Latn', 'aeb_Arab', 'arb_Arab')
  target: string;
}

export interface TranslationResult {
  translated: string;
  source: string;
  target: string;
}

export interface DerjaPromptConfig {
  enableDerja: boolean;
  dialectHint?: 'tn' | 'ar'; // force dialect, or auto-detect
  derjaExamples?: boolean; // include example phrases in prompt
}
