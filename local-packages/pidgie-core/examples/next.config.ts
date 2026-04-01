/**
 * Example Next.js Configuration for BIB Pidgie Applications
 *
 * Copy the relevant sections to your BIB client app:
 * next.config.ts (or next.config.mjs)
 *
 * This configuration includes:
 * - Security headers for all routes
 * - Recommended Next.js security settings
 *
 * Note: If using middleware.ts for headers, you can skip the headers()
 * function here to avoid duplicate headers.
 */

import type { NextConfig } from 'next';
import { generateSecurityHeaders } from '@runwell/pidgie-core';

// =============================================================================
// Security Headers Configuration
// =============================================================================

/**
 * Generate security headers with custom configuration
 *
 * Customize these values for your application:
 * - connectSrc: Add your API domains (e.g., Gemini, OpenAI)
 * - frameAncestors: Restrict where your site can be embedded
 */
const securityHeaders = generateSecurityHeaders({
  // Add external API domains your app connects to
  connectSrc: [
    'https://generativelanguage.googleapis.com', // Google Gemini
    // 'https://api.openai.com', // OpenAI (if used)
  ],
  // Enable HSTS (recommended for production)
  enableHSTS: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
});

// =============================================================================
// Next.js Configuration
// =============================================================================

const nextConfig: NextConfig = {
  /**
   * Security Headers
   *
   * Applied to all routes. For API-specific CORS headers,
   * use middleware.ts instead.
   */
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  /**
   * Recommended Security Settings
   */

  // Disable x-powered-by header (information disclosure)
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,

  /**
   * Image Configuration
   *
   * Restrict image sources for security
   */
  images: {
    remotePatterns: [
      // Add trusted image sources
      {
        protocol: 'https',
        hostname: 'yourdomain.com',
      },
      // Add CDN or other trusted sources as needed
    ],
  },

  /**
   * Redirect HTTP to HTTPS (if not handled by reverse proxy)
   */
  // async redirects() {
  //   return [
  //     {
  //       source: '/:path*',
  //       has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
  //       destination: 'https://yourdomain.com/:path*',
  //       permanent: true,
  //     },
  //   ];
  // },
};

export default nextConfig;
