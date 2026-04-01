/**
 * LLM Attack Pattern Library
 *
 * Curated patterns for detecting prompt injection, jailbreak attempts,
 * and other LLM-specific attacks. Used by all Runwell chatbots via
 * the shared security middleware.
 *
 * Sources: OWASP LLM Top 10, Gandalf dataset, Tensor Trust, HackAPrompt
 */

export interface AttackPattern {
  id: string;
  category: 'injection' | 'jailbreak' | 'extraction' | 'encoding' | 'social' | 'technical';
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

/**
 * Prompt injection patterns (LLM01)
 */
export const INJECTION_PATTERNS: AttackPattern[] = [
  { id: 'INJ-01', category: 'injection', pattern: /ignore\s+(all\s+)?previous\s+instructions/i, severity: 'critical', description: 'Direct instruction override' },
  { id: 'INJ-02', category: 'injection', pattern: /forget\s+(all\s+)?(your\s+)?instructions/i, severity: 'critical', description: 'Instruction forget attempt' },
  { id: 'INJ-03', category: 'injection', pattern: /disregard\s+(all\s+)?(your\s+)?instructions/i, severity: 'critical', description: 'Instruction disregard attempt' },
  { id: 'INJ-04', category: 'injection', pattern: /override\s+(your\s+)?(system\s+)?prompt/i, severity: 'critical', description: 'Prompt override attempt' },
  { id: 'INJ-05', category: 'injection', pattern: /new\s+instructions?\s*:/i, severity: 'high', description: 'New instruction injection' },
  { id: 'INJ-06', category: 'injection', pattern: /from\s+now\s+on,?\s+you\s+(are|will|must)/i, severity: 'high', description: 'Behavioral redefinition' },
  { id: 'INJ-07', category: 'injection', pattern: /act\s+as\s+(a|an|if|though)\s/i, severity: 'medium', description: 'Role impersonation' },
  { id: 'INJ-08', category: 'injection', pattern: /pretend\s+(you\s+are|to\s+be)/i, severity: 'medium', description: 'Pretend role override' },
  { id: 'INJ-09', category: 'injection', pattern: /you\s+are\s+now\s+(a|an|the)/i, severity: 'high', description: 'Identity replacement' },
  { id: 'INJ-10', category: 'injection', pattern: /respond\s+(only\s+)?(with|in)\s+(yes|no|json|xml|code)/i, severity: 'medium', description: 'Output format hijack' },
];

/**
 * Jailbreak patterns (LLM01 variants)
 */
export const JAILBREAK_PATTERNS: AttackPattern[] = [
  { id: 'JB-01', category: 'jailbreak', pattern: /\bDAN\b.*\b(mode|prompt|jailbreak)\b/i, severity: 'critical', description: 'DAN jailbreak' },
  { id: 'JB-02', category: 'jailbreak', pattern: /developer\s+mode/i, severity: 'critical', description: 'Developer mode jailbreak' },
  { id: 'JB-03', category: 'jailbreak', pattern: /\bjailbreak\b/i, severity: 'high', description: 'Explicit jailbreak mention' },
  { id: 'JB-04', category: 'jailbreak', pattern: /evil\s+(mode|bot|ai|assistant)/i, severity: 'high', description: 'Evil mode activation' },
  { id: 'JB-05', category: 'jailbreak', pattern: /no\s+(restrictions?|limitations?|filters?|rules?|guidelines?)/i, severity: 'high', description: 'Restriction removal' },
  { id: 'JB-06', category: 'jailbreak', pattern: /unrestricted\s+(mode|ai|access)/i, severity: 'high', description: 'Unrestricted mode' },
  { id: 'JB-07', category: 'jailbreak', pattern: /bypass\s+(your\s+)?(safety|security|filter|guard)/i, severity: 'critical', description: 'Safety bypass' },
];

/**
 * System prompt extraction patterns (LLM07)
 */
export const EXTRACTION_PATTERNS: AttackPattern[] = [
  { id: 'EX-01', category: 'extraction', pattern: /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/i, severity: 'critical', description: 'Direct prompt request' },
  { id: 'EX-02', category: 'extraction', pattern: /print\s+(your\s+)?(system\s+)?prompt/i, severity: 'critical', description: 'Print prompt request' },
  { id: 'EX-03', category: 'extraction', pattern: /reveal\s+(your\s+)?instructions/i, severity: 'critical', description: 'Instruction reveal request' },
  { id: 'EX-04', category: 'extraction', pattern: /what\s+(are|were)\s+(your\s+)?(initial\s+)?instructions/i, severity: 'high', description: 'Indirect instruction probe' },
  { id: 'EX-05', category: 'extraction', pattern: /repeat\s+(the\s+)?(text\s+)?above/i, severity: 'high', description: 'Repeat-above extraction' },
  { id: 'EX-06', category: 'extraction', pattern: /translate\s+(your\s+)?(system\s+)?(prompt|instructions)\s+to/i, severity: 'high', description: 'Translation-based extraction' },
  { id: 'EX-07', category: 'extraction', pattern: /encode\s+(your\s+)?(system\s+)?(prompt|instructions)\s+(in|to|as)/i, severity: 'high', description: 'Encoding-based extraction' },
  { id: 'EX-08', category: 'extraction', pattern: /summarize\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/i, severity: 'medium', description: 'Summarization-based extraction' },
];

/**
 * Encoding attack patterns (LLM01 variants)
 */
export const ENCODING_PATTERNS: AttackPattern[] = [
  { id: 'EN-01', category: 'encoding', pattern: /[A-Za-z0-9+/]{50,}={0,2}$/m, severity: 'medium', description: 'Potential base64 payload' },
  { id: 'EN-02', category: 'encoding', pattern: /\\x[0-9a-f]{2}/i, severity: 'medium', description: 'Hex escape sequence' },
  { id: 'EN-03', category: 'encoding', pattern: /&#x?[0-9a-f]+;/i, severity: 'medium', description: 'HTML entity encoding' },
  { id: 'EN-04', category: 'encoding', pattern: /%[0-9a-f]{2}.*%[0-9a-f]{2}.*%[0-9a-f]{2}/i, severity: 'medium', description: 'Heavy URL encoding' },
];

/**
 * Social engineering patterns
 */
export const SOCIAL_PATTERNS: AttackPattern[] = [
  { id: 'SE-01', category: 'social', pattern: /i\s+am\s+(the\s+)?(owner|admin|developer|founder|ceo|cto)/i, severity: 'medium', description: 'Authority impersonation' },
  { id: 'SE-02', category: 'social', pattern: /(give|show|tell)\s+me\s+(the\s+)?(api\s+key|password|secret|token|credential)/i, severity: 'critical', description: 'Credential request' },
  { id: 'SE-03', category: 'social', pattern: /this\s+is\s+(a|an)\s+(test|emergency|security\s+audit)/i, severity: 'medium', description: 'False authority context' },
];

/**
 * All patterns combined
 */
export const ALL_ATTACK_PATTERNS: AttackPattern[] = [
  ...INJECTION_PATTERNS,
  ...JAILBREAK_PATTERNS,
  ...EXTRACTION_PATTERNS,
  ...ENCODING_PATTERNS,
  ...SOCIAL_PATTERNS,
];

/**
 * Check input against all attack patterns.
 * Returns matched patterns sorted by severity.
 */
export function detectAttacks(input: string): AttackPattern[] {
  const matches: AttackPattern[] = [];
  for (const pattern of ALL_ATTACK_PATTERNS) {
    if (pattern.pattern.test(input)) {
      matches.push(pattern);
    }
  }
  // Sort by severity: critical > high > medium > low
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return matches.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * Quick check: does input contain any attack pattern?
 */
export function hasAttackPattern(input: string): boolean {
  return ALL_ATTACK_PATTERNS.some(p => p.pattern.test(input));
}
