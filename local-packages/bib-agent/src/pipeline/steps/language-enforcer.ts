/**
 * LanguageEnforcer — Detects response/user language mismatch
 *
 * Heuristic-based language detection for Arabic, French, and English.
 * Raises a warning flag when the response language differs from the
 * user's message language. Text is NEVER modified — warning only.
 *
 * Order: 70 (runs after UrlPolicyEnforcer at 60)
 *
 * @see spec Phase 6 — LanguageEnforcer
 */

import type { PipelineStep, PipelineContext, PipelineResult, PipelineFlag } from '../types.js';
import { detectDerja } from '@runwell/shared-tools/derja';

// =============================================================================
// Language Detection
// =============================================================================

type DetectedLanguage = 'ar' | 'tn' | 'fr' | 'en';

const FRENCH_ACCENT_PATTERN = /[éèêëàâçùûôîïæœ]/g;
const FRENCH_WORD_PATTERN =
  /(?:^|\s)(?:nous|vous|les|des|est|pour|dans|avec|une|qui|sur|pas|sont|mais|tout|cette|comme|plus|leur|bien|très|fait|être|avoir|faire|dire|aller|voir|savoir|pouvoir|vouloir)(?:\s|$|[.,!?])/gi;

function detectLanguage(text: string): DetectedLanguage {
  // Arabic: check Unicode range
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars > text.length * 0.3) {
    // Sub-classify: Tunisian Derja vs MSA
    const derjaResult = detectDerja(text);
    if (derjaResult.dialect === 'tn') return 'tn';
    return 'ar';
  }

  // French: accent characters + common French words
  const accentCount = (text.match(FRENCH_ACCENT_PATTERN) || []).length;
  const frenchWordCount = (text.match(FRENCH_WORD_PATTERN) || []).length;
  if (accentCount >= 2 || frenchWordCount >= 2) return 'fr';

  // Default: English
  return 'en';
}

// =============================================================================
// LanguageEnforcer
// =============================================================================

export class LanguageEnforcer implements PipelineStep {
  name = 'language-enforcer';
  order = 70;

  process(text: string, ctx: PipelineContext): PipelineResult {
    const flags: PipelineFlag[] = [];

    const responseLang = detectLanguage(text);
    const messageLang = detectLanguage(ctx.originalMessage);

    if (responseLang !== messageLang) {
      flags.push({
        step: this.name,
        severity: 'warning',
        message: `Language mismatch: response in "${responseLang}", user message in "${messageLang}"`,
      });
    }

    // Text is returned UNMODIFIED — warning only
    return { text, flags };
  }
}
