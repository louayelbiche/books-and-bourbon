/**
 * Classify scrape errors into user-facing error codes.
 *
 * Centralizes error pattern matching so all scrape routes
 * return consistent, specific error messages instead of generic "UNKNOWN".
 */

export interface ScrapeErrorResult {
  code: string;
  status: number;
}

/**
 * Classify a scrape error into a specific error code and HTTP status.
 *
 * Error codes map to i18n keys in each app's locale files:
 * - `scrapeErrors.{CODE}` (shopimate-landing)
 * - `errors.scrape.{CODE}` (pidgie-demo)
 */
export function classifyScrapeError(error: unknown): ScrapeErrorResult {
  if (!(error instanceof Error)) {
    return { code: 'UNKNOWN', status: 500 };
  }

  const message = error.message || '';
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const causeCode = cause?.code || '';
  const statusCode = (error as Error & { statusCode?: number }).statusCode;

  // 403 — site blocked access
  if (statusCode === 403) {
    return { code: 'SITE_PROTECTED', status: 403 };
  }

  // DNS resolution failure — domain doesn't exist
  if (message.includes('ENOTFOUND') || message.includes('getaddrinfo') || causeCode === 'ENOTFOUND') {
    return { code: 'NOT_FOUND', status: 400 };
  }

  // Connection refused — server is down or not listening
  if (message.includes('ECONNREFUSED') || causeCode === 'ECONNREFUSED') {
    return { code: 'SITE_UNREACHABLE', status: 502 };
  }

  // Connection reset — server dropped the connection
  if (message.includes('ECONNRESET') || message.includes('EPIPE') || causeCode === 'ECONNRESET') {
    return { code: 'SITE_UNREACHABLE', status: 502 };
  }

  // Timeout — server too slow to respond
  if (
    message.includes('timeout') ||
    message.includes('TIMEOUT') ||
    message.includes('ETIMEDOUT') ||
    message.includes('AbortError') ||
    causeCode === 'ETIMEDOUT' ||
    error.name === 'AbortError' ||
    error.name === 'TimeoutError'
  ) {
    return { code: 'TIMEOUT', status: 504 };
  }

  // SSL/TLS errors — certificate issues
  if (
    message.includes('CERT_') ||
    message.includes('SSL') ||
    message.includes('TLS') ||
    message.includes('self-signed') ||
    message.includes('UNABLE_TO_VERIFY') ||
    message.includes('ERR_TLS') ||
    causeCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    causeCode === 'CERT_HAS_EXPIRED'
  ) {
    return { code: 'SSL_ERROR', status: 502 };
  }

  // HTTP server errors (from our enhanced fetchPage)
  if (message.startsWith('HTTP_')) {
    const statusMatch = message.match(/HTTP_(\d+)/);
    const httpStatus = statusMatch ? parseInt(statusMatch[1], 10) : 0;
    if (httpStatus >= 500) {
      return { code: 'SITE_ERROR', status: 502 };
    }
    if (httpStatus === 404) {
      return { code: 'SITE_NOT_FOUND', status: 400 };
    }
    return { code: 'SITE_ERROR', status: 502 };
  }

  // Non-HTML response
  if (message.startsWith('NOT_HTML')) {
    return { code: 'NOT_HTML', status: 400 };
  }

  // Fallback
  return { code: 'UNKNOWN', status: 500 };
}
