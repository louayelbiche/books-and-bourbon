/**
 * Security Module
 *
 * Provides security utilities for pidgie-core applications including:
 * - HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - CORS validation and configuration
 * - SSRF protection for URL fetching
 * - Rate limiting helpers
 *
 * @example
 * ```typescript
 * // In next.config.js
 * import { securityHeaders } from '@runwell/pidgie-core/security';
 *
 * export default {
 *   async headers() {
 *     return [{ source: '/(.*)', headers: securityHeaders }];
 *   },
 * };
 * ```
 *
 * @example
 * ```typescript
 * // In middleware.ts
 * import { createCORSValidator, securityHeadersMap } from '@runwell/pidgie-core/security';
 *
 * const cors = createCORSValidator({
 *   allowedOrigins: ['https://mysite.com'],
 * });
 *
 * export function middleware(request: NextRequest) {
 *   const origin = request.headers.get('origin');
 *
 *   if (!cors.isOriginAllowed(origin)) {
 *     return cors.forbidden();
 *   }
 *
 *   const response = NextResponse.next();
 *   for (const [key, value] of Object.entries(securityHeadersMap)) {
 *     response.headers.set(key, value);
 *   }
 *   return response;
 * }
 * ```
 *
 * @example
 * ```typescript
 * // SSRF protection for URL fetching
 * import { validateExternalUrl, isBlockedUrl } from '@runwell/pidgie-core/security';
 *
 * const result = validateExternalUrl(userProvidedUrl);
 * if (!result.valid) {
 *   return new Response(result.error, { status: 400 });
 * }
 * const response = await fetch(result.url);
 * ```
 *
 * @example
 * ```typescript
 * // Rate limiting in API routes
 * import { createRateLimiter } from '@runwell/pidgie-core/security';
 *
 * const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 30 });
 *
 * export async function POST(request: Request) {
 *   const ip = request.headers.get('x-forwarded-for') || 'unknown';
 *   if (!limiter.check(ip)) {
 *     return new Response('Too many requests', { status: 429 });
 *   }
 *   // ... handle request
 * }
 * ```
 */

// Security Headers
export {
  generateSecurityHeaders,
  securityHeaders,
  securityHeadersMap,
  DEFAULT_SECURITY_HEADERS_CONFIG,
  STRICT_CSP_PRESET,
  API_SECURITY_PRESET,
  type SecurityHeadersConfig,
} from './headers.js';

// CORS
export {
  validateCORSOrigin,
  getCORSHeaders,
  createCORSPreflightResponse,
  createCORSValidator,
  DEFAULT_CORS_CONFIG,
  type CORSConfig,
} from './cors.js';

// SSRF Protection
export {
  isBlockedUrl,
  sanitizeUrl,
  validateExternalUrl,
} from './ssrf.js';

// Rate Limiting
export {
  createRateLimiter,
  createSlidingWindowLimiter,
  type RateLimiterConfig,
  type RateLimitResult,
} from './rate-limiting.js';

// Prompt Security Rules
export {
  SECURITY_RULES,
  BUSINESS_LOGIC_RULES,
  PROMPT_INJECTION_PATTERNS,
  isPromptInjectionAttempt,
  getAllSecurityRules,
  getSafeRedirectResponse,
} from './prompt-rules.js';
