/**
 * Heuristic Derja vs MSA detector.
 *
 * Uses common Tunisian vocabulary, spelling markers, negation patterns,
 * and Arabizi (Latin-script Tunisian) to distinguish Tunisian Derja
 * from Modern Standard Arabic.
 */

import type { DerjaDetectionResult } from './types.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a regex that matches an Arabic word at a word boundary.
 * JavaScript's \b only works with ASCII word characters, so we use
 * a lookaround-free approach: match at start/end of string or adjacent
 * to a space/non-Arabic character.
 */
function arabicWord(word: string): RegExp {
  // Match the word when surrounded by non-Arabic characters, spaces, or string edges
  return new RegExp(`(?:^|[^\\u0600-\\u06FF])${word}(?:[^\\u0600-\\u06FF]|$)`);
}

// =============================================================================
// Derja Markers (Arabic script)
// =============================================================================

/**
 * High-confidence Tunisian Derja markers.
 * Each entry is a regex pattern matching a word/phrase unique to or
 * overwhelmingly more common in Tunisian Arabic than MSA.
 */
const DERJA_MARKERS: { pattern: RegExp; label: string }[] = [
  // Pronouns and demonstratives
  { pattern: arabicWord('انا'), label: 'انا (ena)' },
  { pattern: arabicWord('هاو'), label: 'هاو (haw)' },
  { pattern: arabicWord('هاي'), label: 'هاي (hay)' },
  { pattern: arabicWord('هاك'), label: 'هاك (hak)' },
  { pattern: arabicWord('هاذي'), label: 'هاذي (hadhi)' },
  { pattern: arabicWord('هاذا'), label: 'هاذا (hadha)' },

  // Common verbs
  { pattern: arabicWord('نحب'), label: 'نحب (nheb)' },
  { pattern: arabicWord('يخدم'), label: 'يخدم (yekhdim)' },
  { pattern: arabicWord('نحكي'), label: 'نحكي (nahki)' },
  { pattern: arabicWord('يحكي'), label: 'يحكي (yahki)' },
  { pattern: arabicWord('نعمل'), label: 'نعمل (naamel)' },
  { pattern: arabicWord('برشا'), label: 'برشا (barsha)' },
  { pattern: arabicWord('انجم'), label: 'انجم (enjam)' },
  { pattern: arabicWord('نجم'), label: 'نجم (najam)' },
  { pattern: arabicWord('تنجم'), label: 'تنجم (tenjam)' },

  // Particles and conjunctions
  { pattern: arabicWord('باش'), label: 'باش (besh)' },
  { pattern: arabicWord('فما'), label: 'فما (famma)' },
  { pattern: arabicWord('ماكش'), label: 'ماكش (mekesh)' },
  { pattern: arabicWord('مانيش'), label: 'مانيش (menish)' },
  { pattern: arabicWord('ياسر'), label: 'ياسر (yaser)' },
  { pattern: arabicWord('توا'), label: 'توا (tawa)' },
  { pattern: arabicWord('قاعد'), label: 'قاعد (qaed)' },

  // Question words
  { pattern: arabicWord('كيفاش'), label: 'كيفاش (kifesh)' },
  { pattern: arabicWord('علاش'), label: 'علاش (alesh)' },
  { pattern: arabicWord('وقتاش'), label: 'وقتاش (waqtesh)' },
  { pattern: arabicWord('شكون'), label: 'شكون (shkoun)' },
  { pattern: arabicWord('آش'), label: 'آش (esh)' },
  { pattern: arabicWord('اشنوا'), label: 'اشنوا (eshnowa)' },
  { pattern: arabicWord('وين'), label: 'وين (win)' },

  // French loanwords in Arabic script
  { pattern: arabicWord('نورمال'), label: 'نورمال (normal)' },
  { pattern: arabicWord('بونجور'), label: 'بونجور (bonjour)' },
  { pattern: arabicWord('ميرسي'), label: 'ميرسي (merci)' },
  { pattern: arabicWord('ترانكيل'), label: 'ترانكيل (tranquille)' },

  // Filler / interjection
  { pattern: arabicWord('يزي'), label: 'يزي (yezzi)' },
  { pattern: arabicWord('بالحق'), label: 'بالحق (bel7a9)' },
];

/**
 * Negation pattern: ما...ش wrapping a verb.
 * This is a strong Derja signal. MSA uses لا or لم for negation.
 * Example: ما نجمش (manajamsh), ما فهمتش (mafhamtesh)
 */
const NEGATION_MA_SH = /ما\s*[\u0600-\u06FF]+ش/;

// =============================================================================
// Arabizi Markers (Latin script)
// =============================================================================

/**
 * Arabizi patterns: digits used as Arabic letter substitutes in Latin text.
 * 3 = ع (ain), 5 = خ (kha), 7 = ح (ha), 9 = ق (qaf)
 */
const ARABIZI_DIGIT_LETTERS = /[a-zA-Z]*[3579][a-zA-Z]+|[a-zA-Z]+[3579][a-zA-Z]*/g;

/**
 * Common Arabizi Tunisian words.
 */
const ARABIZI_WORDS: RegExp[] = [
  /\bbech\b/i,
  /\b5ater\b/i,
  /\b7ata\b/i,
  /\b9a3ed\b/i,
  /\bbarsha\b/i,
  /\byezzi\b/i,
  /\bkifesh\b/i,
  /\bnheb\b/i,
  /\byekhdim\b/i,
  /\btawa\b/i,
  /\bfamma\b/i,
  /\bya5i\b/i,
  /\bmanajamsh\b/i,
  /\bchkoun\b/i,
  /\bena\b/i,
  /\benjam\b/i,
  /\bnajam\b/i,
  /\btenjam\b/i,
];

// =============================================================================
// Detection
// =============================================================================

/**
 * Detect whether text is Tunisian Derja, MSA, or unknown.
 *
 * Algorithm:
 * 1. Check if text contains Arabic-script characters. If yes, scan for Derja markers.
 * 2. If no Arabic script, check for Arabizi patterns (Latin-script Tunisian).
 * 3. Score based on marker count and negation pattern.
 */
export function detectDerja(text: string): DerjaDetectionResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { dialect: 'unknown', confidence: 0, markers: [] };
  }

  // Check for Arabic-script characters
  const arabicChars = (trimmed.match(/[\u0600-\u06FF]/g) || []).length;
  const hasArabicScript = arabicChars > trimmed.length * 0.15;

  if (hasArabicScript) {
    return detectFromArabicScript(trimmed);
  }

  // Check for Arabizi (Latin-script Tunisian)
  return detectFromArabizi(trimmed);
}

function detectFromArabicScript(text: string): DerjaDetectionResult {
  const markers: string[] = [];

  // Scan for Derja vocabulary markers
  for (const { pattern, label } of DERJA_MARKERS) {
    if (pattern.test(text)) {
      markers.push(label);
    }
  }

  // Check negation pattern
  if (NEGATION_MA_SH.test(text)) {
    markers.push('ما...ش negation');
  }

  // Classify based on marker count
  if (markers.length >= 3) {
    return { dialect: 'tn', confidence: 0.95, markers };
  }
  if (markers.length === 2) {
    return { dialect: 'tn', confidence: 0.85, markers };
  }
  if (markers.length === 1) {
    return { dialect: 'tn', confidence: 0.65, markers };
  }

  // No Derja markers found; assume MSA
  return { dialect: 'ar', confidence: 0.7, markers: [] };
}

function detectFromArabizi(text: string): DerjaDetectionResult {
  const markers: string[] = [];

  // Check for digit-letter patterns (3, 5, 7, 9 as Arabic letters)
  const digitLetterMatches = text.match(ARABIZI_DIGIT_LETTERS) || [];
  if (digitLetterMatches.length > 0) {
    markers.push(`arabizi digits: ${digitLetterMatches.slice(0, 3).join(', ')}`);
  }

  // Check for known Arabizi words
  for (const pattern of ARABIZI_WORDS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        markers.push(`arabizi: ${match[0]}`);
      }
    }
  }

  if (markers.length >= 2) {
    return { dialect: 'tn', confidence: 0.8, markers };
  }
  if (markers.length === 1) {
    return { dialect: 'tn', confidence: 0.5, markers };
  }

  return { dialect: 'unknown', confidence: 0, markers: [] };
}
