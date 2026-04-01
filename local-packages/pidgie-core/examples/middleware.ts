/**
 * Example Middleware for BIB Pidgie Applications
 *
 * Copy this file to your BIB client app root:
 * middleware.ts
 *
 * This middleware provides:
 * - Security headers on all responses (CSP, HSTS, X-Frame-Options, etc.)
 * - CORS validation for API routes
 * - Request ID tracking
 *
 * Customize the allowedOrigins array with your domain(s).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  securityHeadersMap,
  createCORSValidator,
} from '@runwell/pidgie-core';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Allowed origins for CORS
 * Add your production and staging domains here
 */
const ALLOWED_ORIGINS = [
  // Production
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  // Staging
  'https://staging.yourdomain.com',
  // Development (comment out in production)
  'http://localhost:3000',
  'http://localhost:3001',
];

/**
 * Paths that require CORS validation
 */
const API_PATHS = ['/api/'];

/**
 * Paths to exclude from security headers (if any)
 */
const EXCLUDED_PATHS: string[] = [];

// =============================================================================
// CORS Validator
// =============================================================================

const cors = createCORSValidator({
  allowedOrigins: ALLOWED_ORIGINS,
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  allowCredentials: false,
  maxAge: 86400, // 24 hours
});

// =============================================================================
// Middleware
// =============================================================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Skip excluded paths
  if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Handle CORS preflight (OPTIONS requests)
  if (request.method === 'OPTIONS') {
    if (!cors.isOriginAllowed(origin)) {
      return cors.forbidden();
    }
    return cors.preflight(origin);
  }

  // Validate CORS for API routes
  const isApiRoute = API_PATHS.some((path) => pathname.startsWith(path));
  if (isApiRoute && origin && !cors.isOriginAllowed(origin)) {
    return cors.forbidden();
  }

  // Create response with security headers
  const response = NextResponse.next();

  // Add security headers
  for (const [key, value] of Object.entries(securityHeadersMap)) {
    response.headers.set(key, value);
  }

  // Add CORS headers for API routes
  if (isApiRoute) {
    const corsHeaders = cors.getHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  // Add request ID for tracing
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);

  return response;
}

// =============================================================================
// Matcher Configuration
// =============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
