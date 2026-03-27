/**
 * Session management: minimal endpoint.
 * Chat routes through BIB; sessions are just client-side IDs.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(): Promise<Response> {
  return NextResponse.json({ sessionId: crypto.randomUUID() });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: 'Use POST to create a session' }, { status: 405 });
}
