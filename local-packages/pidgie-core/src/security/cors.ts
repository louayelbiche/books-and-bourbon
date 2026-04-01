/**
 * CORS Configuration
 *
 * Provides CORS validation utilities for API routes using pidgie-core.
 * Ensures only authorized origins can access the chat API.
 *
 * @example
 * ```typescript
 * import { validateCORSOrigin, getCORSHeaders } from '@runwell/pidgie-core/security';
 *
 * // In API route
 * const origin = request.headers.get('origin');
 * if (!validateCORSOrigin(origin, ['https://mysite.com'])) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 */

export interface CORSConfig {
  /** Allowed origins. Use '*' for any origin (not recommended for production) */
  allowedOrigins: string[];
  /** Allowed HTTP methods. Default: ['GET', 'POST', 'OPTIONS'] */
  allowedMethods?: string[];
  /** Allowed headers. Default: ['Content-Type', 'Authorization'] */
  allowedHeaders?: string[];
  /** Exposed headers that browsers can access */
  exposedHeaders?: string[];
  /** Allow credentials (cookies, auth headers). Default: false */
  allowCredentials?: boolean;
  /** Max age for preflight cache in seconds. Default: 86400 (24 hours) */
  maxAge?: number;
}

/**
 * Default CORS configuration
 */
export const DEFAULT_CORS_CONFIG: Required<CORSConfig> = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  allowCredentials: false,
  maxAge: 86400, // 24 hours
};

/**
 * Check if running in production environment
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Validate if an origin is allowed
 *
 * @param origin - The origin header from the request
 * @param allowedOrigins - List of allowed origins
 * @param options - Additional validation options
 * @returns true if origin is allowed, false otherwise
 */
export function validateCORSOrigin(
  origin: string | null | undefined,
  allowedOrigins: string[],
  options: { requireHTTPS?: boolean; warnOnWildcard?: boolean } = {}
): boolean {
  const { requireHTTPS = isProduction(), warnOnWildcard = true } = options;

  // No origin header (same-origin request or non-browser) - allow
  if (!origin) {
    return true;
  }

  // Wildcard allows all (not recommended for production)
  if (allowedOrigins.includes('*')) {
    if (warnOnWildcard && isProduction()) {
      console.warn(
        '[pidgie/security] WARNING: Using wildcard (*) CORS origin in production is insecure'
      );
    }
    return true;
  }

  // Enforce HTTPS in production
  if (requireHTTPS) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.protocol !== 'https:') {
        console.warn(
          `[pidgie/security] Rejecting non-HTTPS origin in production: ${origin}`
        );
        return false;
      }
    } catch {
      return false;
    }
  }

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check pattern match (e.g., '*.example.com')
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      try {
        const originUrl = new URL(origin);
        if (
          originUrl.hostname === domain ||
          originUrl.hostname.endsWith('.' + domain)
        ) {
          return true;
        }
      } catch {
        // Invalid origin URL
      }
    }
  }

  return false;
}

/**
 * Generate CORS headers for a response
 *
 * @param origin - The origin header from the request
 * @param config - CORS configuration
 * @returns Headers object with CORS headers
 */
export function getCORSHeaders(
  origin: string | null | undefined,
  config: Partial<CORSConfig> = {}
): Record<string, string> {
  const mergedConfig = { ...DEFAULT_CORS_CONFIG, ...config };
  const headers: Record<string, string> = {};

  // Set allowed origin
  if (origin && validateCORSOrigin(origin, mergedConfig.allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  // Set allowed methods
  headers['Access-Control-Allow-Methods'] = mergedConfig.allowedMethods.join(', ');

  // Set allowed headers
  headers['Access-Control-Allow-Headers'] = mergedConfig.allowedHeaders.join(', ');

  // Set exposed headers
  if (mergedConfig.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = mergedConfig.exposedHeaders.join(', ');
  }

  // Set credentials
  if (mergedConfig.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Set max age
  headers['Access-Control-Max-Age'] = String(mergedConfig.maxAge);

  return headers;
}

/**
 * Create a CORS preflight response (for OPTIONS requests)
 *
 * @param origin - The origin header from the request
 * @param config - CORS configuration
 * @returns Response object for OPTIONS preflight
 */
export function createCORSPreflightResponse(
  origin: string | null | undefined,
  config: Partial<CORSConfig> = {}
): Response {
  const headers = getCORSHeaders(origin, config);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * CORS middleware factory for API routes
 *
 * @param config - CORS configuration
 * @returns Middleware function that validates CORS
 */
export function createCORSValidator(config: Partial<CORSConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CORS_CONFIG, ...config };

  return {
    /**
     * Validate if a request origin is allowed
     */
    isOriginAllowed(origin: string | null | undefined): boolean {
      return validateCORSOrigin(origin, mergedConfig.allowedOrigins);
    },

    /**
     * Get CORS headers for a response
     */
    getHeaders(origin: string | null | undefined): Record<string, string> {
      return getCORSHeaders(origin, mergedConfig);
    },

    /**
     * Create preflight response
     */
    preflight(origin: string | null | undefined): Response {
      return createCORSPreflightResponse(origin, mergedConfig);
    },

    /**
     * Create forbidden response for invalid origin
     */
    forbidden(): Response {
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    },
  };
}
