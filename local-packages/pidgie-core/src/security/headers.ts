/**
 * Security Headers Configuration
 *
 * Provides security headers for Next.js applications using pidgie-core.
 * These headers protect against common web vulnerabilities.
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
 * // Use strict preset for higher security
 * import { generateSecurityHeaders, STRICT_CSP_PRESET } from '@runwell/pidgie-core/security';
 *
 * const headers = generateSecurityHeaders({
 *   ...STRICT_CSP_PRESET,
 *   connectSrc: ['https://api.yoursite.com'],
 * });
 * ```
 */

export interface SecurityHeadersConfig {
  /** Allowed frame ancestors for X-Frame-Options and CSP. Default: 'self' */
  frameAncestors?: string;
  /** Enable HSTS. Default: true */
  enableHSTS?: boolean;
  /** HSTS max-age in seconds. Default: 31536000 (1 year) */
  hstsMaxAge?: number;
  /** Include subdomains in HSTS. Default: true */
  hstsIncludeSubdomains?: boolean;
  /** Allowed connect-src domains for CSP (in addition to 'self'). */
  connectSrc?: string[];
  /** Allowed script-src for CSP. Default: ['self', 'unsafe-inline', 'unsafe-eval'] */
  scriptSrc?: string[];
  /** Allowed style-src for CSP. Default: ['self', 'unsafe-inline'] */
  styleSrc?: string[];
  /** Allowed img-src for CSP. Default: ['self', 'data:', 'https:'] */
  imgSrc?: string[];
  /** Allowed font-src for CSP. Default: ['self', 'data:'] */
  fontSrc?: string[];
  /** Allowed object-src for CSP. Default: ['none'] */
  objectSrc?: string[];
  /** Allowed worker-src for CSP. Default: ['self'] */
  workerSrc?: string[];
  /** Enable upgrade-insecure-requests directive. Default: true in production */
  upgradeInsecureRequests?: boolean;
  /** Block mixed content. Default: true in production */
  blockMixedContent?: boolean;
}

/**
 * Check if running in production environment
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Default security headers configuration
 * Balanced for Next.js compatibility (requires unsafe-inline for styled-jsx)
 */
export const DEFAULT_SECURITY_HEADERS_CONFIG: Required<SecurityHeadersConfig> = {
  frameAncestors: "'self'",
  enableHSTS: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
  connectSrc: [],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'", 'data:'],
  objectSrc: ["'none'"],
  workerSrc: ["'self'"],
  upgradeInsecureRequests: true,
  blockMixedContent: true,
};

/**
 * Strict CSP preset - use when you don't need unsafe-inline/eval
 * Requires proper nonce implementation for inline scripts
 */
export const STRICT_CSP_PRESET: Partial<SecurityHeadersConfig> = {
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: "'none'",
  upgradeInsecureRequests: true,
  blockMixedContent: true,
};

/**
 * API-only preset - for API routes that don't serve HTML
 */
export const API_SECURITY_PRESET: Partial<SecurityHeadersConfig> = {
  frameAncestors: "'none'",
  scriptSrc: ["'none'"],
  styleSrc: ["'none'"],
  imgSrc: ["'none'"],
  fontSrc: ["'none'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: true,
  blockMixedContent: true,
};

/**
 * Generate security headers for Next.js configuration
 *
 * @param config - Optional configuration overrides
 * @returns Array of header objects for Next.js headers() config
 */
export function generateSecurityHeaders(
  config: SecurityHeadersConfig = {}
): Array<{ key: string; value: string }> {
  const mergedConfig = { ...DEFAULT_SECURITY_HEADERS_CONFIG, ...config };

  // Build CSP directives
  const cspDirectives = [
    `default-src 'self'`,
    `script-src ${mergedConfig.scriptSrc.join(' ')}`,
    `style-src ${mergedConfig.styleSrc.join(' ')}`,
    `img-src ${mergedConfig.imgSrc.join(' ')}`,
    `font-src ${mergedConfig.fontSrc.join(' ')}`,
    `connect-src 'self'${mergedConfig.connectSrc.length ? ' ' + mergedConfig.connectSrc.join(' ') : ''}`,
    `frame-ancestors ${mergedConfig.frameAncestors}`,
    `object-src ${mergedConfig.objectSrc.join(' ')}`,
    `worker-src ${mergedConfig.workerSrc.join(' ')}`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ];

  // Add upgrade-insecure-requests in production
  if (mergedConfig.upgradeInsecureRequests && isProduction()) {
    cspDirectives.push('upgrade-insecure-requests');
  }

  // Block mixed content
  if (mergedConfig.blockMixedContent && isProduction()) {
    cspDirectives.push('block-all-mixed-content');
  }

  const headers: Array<{ key: string; value: string }> = [
    // Content Security Policy
    {
      key: 'Content-Security-Policy',
      value: cspDirectives.join('; '),
    },
    // Prevent MIME type sniffing
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    // Clickjacking protection
    {
      key: 'X-Frame-Options',
      value: mergedConfig.frameAncestors === "'self'" ? 'SAMEORIGIN' : 'DENY',
    },
    // XSS Protection (legacy browsers)
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    // Referrer Policy
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    // Permissions Policy - disable sensitive features
    {
      key: 'Permissions-Policy',
      value: [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
      ].join(', '),
    },
  ];

  // Add HSTS if enabled
  if (mergedConfig.enableHSTS) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: `max-age=${mergedConfig.hstsMaxAge}${mergedConfig.hstsIncludeSubdomains ? '; includeSubDomains' : ''}`,
    });
  }

  return headers;
}

/**
 * Pre-configured security headers with defaults
 * Ready to use in next.config.js headers() function
 */
export const securityHeaders = generateSecurityHeaders();

/**
 * Security headers as a plain object (for middleware or manual setting)
 */
export const securityHeadersMap: Record<string, string> = securityHeaders.reduce(
  (acc, header) => {
    acc[header.key] = header.value;
    return acc;
  },
  {} as Record<string, string>
);
