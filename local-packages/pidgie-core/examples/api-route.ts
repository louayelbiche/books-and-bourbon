/**
 * Example API Route for Pidgie Chat
 *
 * Copy this file to your BIB client app:
 * app/api/pidgie/chat/route.ts
 *
 * This demonstrates the full security integration with:
 * - Input validation (injection detection)
 * - Rate limiting (per-session and per-IP)
 * - Output validation (canary tokens, PII detection)
 * - CORS validation (origin checking)
 * - Security event logging
 *
 * IMPORTANT: Also copy the middleware.ts and next.config.ts examples
 * for comprehensive security headers (CSP, HSTS, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  PidgieAgent,
  createCORSValidator,
  type BusinessData,
} from '@runwell/pidgie-core';
import { createStrictSecurityGuard } from '@runwell/agent-core';

// Your business data - in production, load from database or config
const businessData: BusinessData = {
  id: 'your-business-id',
  name: 'Your Business Name',
  description: 'Description of your business',
  category: 'restaurant', // or hotel, retail, service, etc.
  contact: {
    phone: '555-123-4567',
    email: 'hello@yourbusiness.com',
    website: 'https://yourbusiness.com',
  },
  hours: {
    timezone: 'America/New_York',
    regular: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: null, // Closed
      sunday: null,   // Closed
    },
  },
  services: [
    {
      id: 'service-1',
      name: 'Your Service',
      description: 'Description of your service',
      available: true,
    },
  ],
  faqs: [
    {
      id: 'faq-1',
      question: 'What are your hours?',
      answer: 'We are open Monday through Friday, 9am to 5pm.',
    },
  ],
};

// =============================================================================
// Security Configuration
// =============================================================================

/**
 * CORS Validator
 * Add your allowed origins here (production, staging, localhost)
 */
const cors = createCORSValidator({
  allowedOrigins: [
    // Production
    'https://yourbusiness.com',
    // Staging
    'https://staging.yourbusiness.com',
    // Development (remove in production)
    'http://localhost:3000',
  ],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Request-ID'],
});

/**
 * Security Guard for input/output validation
 */
const securityGuard = createStrictSecurityGuard({
  // Callback for security events (log to your monitoring system)
  onSecurityEvent: (event) => {
    console.warn('[Security Event]', event);
    // In production, send to your logging/monitoring service
    // await logToSentry(event);
    // await logToDatadog(event);
  },
});

// Generate a canary token for the system prompt
const canaryToken = securityGuard.generateCanary();

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * OPTIONS /api/pidgie/chat
 *
 * CORS preflight handler
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Validate origin
  if (!cors.isOriginAllowed(origin)) {
    return cors.forbidden();
  }

  return cors.preflight(origin);
}

/**
 * POST /api/pidgie/chat
 *
 * Request body:
 * {
 *   "message": "What are your hours?",
 *   "sessionId": "session-123"
 * }
 *
 * Response:
 * {
 *   "text": "We are open Monday through Friday, 9am to 5pm.",
 *   "sessionId": "session-123"
 * }
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  // === SECURITY CHECK 0: CORS Validation ===
  if (origin && !cors.isOriginAllowed(origin)) {
    return cors.forbidden();
  }

  // Helper to add CORS and security headers to responses
  const withHeaders = (response: NextResponse) => {
    const corsHeaders = cors.getHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    response.headers.set('X-Request-ID', requestId);
    return response;
  };

  try {
    // Parse request body
    const body = await request.json();
    const { message, sessionId } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return withHeaders(
        NextResponse.json({ error: 'Message is required' }, { status: 400 })
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return withHeaders(
        NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
      );
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // === SECURITY CHECK 1: Validate Input ===
    const inputValidation = securityGuard.validateInput(message, {
      sessionId,
      ip: clientIP,
    });

    if (!inputValidation.safe) {
      // Check if rate limited
      if (inputValidation.rateLimit && !inputValidation.rateLimit.allowed) {
        const response = NextResponse.json(
          {
            error: 'Too many requests. Please slow down.',
            retryAfter: inputValidation.rateLimit.retryAfter,
          },
          { status: 429 }
        );
        response.headers.set(
          'Retry-After',
          String(inputValidation.rateLimit.retryAfter || 60)
        );
        return withHeaders(response);
      }

      // Log security event and reject
      securityGuard.logSecurityEvent({
        type: 'INJECTION_ATTEMPT',
        sessionId,
        ip: clientIP,
        severity: 'high',
        description: 'Blocked input due to security threat',
        details: { threats: inputValidation.threats.map((t) => t.type) },
      });

      return withHeaders(
        NextResponse.json({ error: 'Invalid input' }, { status: 400 })
      );
    }

    // === PROCESS WITH AGENT ===
    const agent = new PidgieAgent({
      businessData,
      config: {
        greeting: `Welcome to ${businessData.name}! How can I help you today?`,
      },
    });

    // Use spotlighted (wrapped) input for extra safety
    const result = await agent.analyze({
      clientId: businessData.id,
      sessionId,
      userId: sessionId, // Anonymous user
      query: inputValidation.sanitized, // Use sanitized input
    });

    if (!result.success) {
      return withHeaders(
        NextResponse.json({ text: result.response, sessionId }, { status: 200 })
      );
    }

    // === SECURITY CHECK 2: Validate Output ===
    const outputValidation = securityGuard.validateOutput(result.response, {
      sessionId,
    });

    if (!outputValidation.safe) {
      // Log the event - something tried to leak through
      securityGuard.logSecurityEvent({
        type: 'SECRET_IN_OUTPUT',
        sessionId,
        severity: 'critical',
        description: 'Blocked output due to security threat',
        details: { threats: outputValidation.threats.map((t) => t.type) },
      });

      // Return sanitized response or generic message
      return withHeaders(
        NextResponse.json(
          {
            text:
              outputValidation.sanitized ||
              "I'm sorry, I cannot help with that request.",
            sessionId,
          },
          { status: 200 }
        )
      );
    }

    // === RETURN SAFE RESPONSE ===
    return withHeaders(
      NextResponse.json({
        text: result.response,
        sessionId,
        toolsUsed: result.findings?.toolsUsed,
      })
    );
  } catch (error) {
    console.error('[Pidgie API Error]', error);

    return withHeaders(
      NextResponse.json(
        { error: 'An error occurred processing your request' },
        { status: 500 }
      )
    );
  }
}

/**
 * GET /api/pidgie/chat
 *
 * Health check and info endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'pidgie',
    business: businessData.name,
    capabilities: ['chat', 'business_info', 'hours', 'services', 'faqs'],
  });
}
