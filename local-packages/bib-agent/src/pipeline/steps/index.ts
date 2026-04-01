/**
 * Pipeline Steps — Barrel Export
 *
 * Mandatory steps (always included in default pipeline):
 * - FactGuard (order=10) — detects fabricated claims about missing data
 * - VoiceEnforcer (order=20) — detects third-person AI references
 * - DataIntegrityGuard (order=30) — catches implicit data claims
 *
 * Opt-in steps (added via configurePipeline):
 * - TemplateResolverStep (order=40) — resolves {{metric:id}} placeholders
 * - NumberGuardStep (order=50) — detects hallucinated numbers
 * - UrlPolicyEnforcer (order=60) — removes absolute URLs
 * - LanguageEnforcer (order=70) — detects response/user language mismatch
 */

export { FactGuard } from './fact-guard.js';
export { VoiceEnforcer } from './voice-enforcer.js';
export { DataIntegrityGuard } from './data-integrity-guard.js';
export { TemplateResolverStep } from './template-resolver.js';
export { NumberGuardStep } from './number-guard.js';
export { UrlPolicyEnforcer } from './url-policy.js';
export { LanguageEnforcer } from './language-enforcer.js';
