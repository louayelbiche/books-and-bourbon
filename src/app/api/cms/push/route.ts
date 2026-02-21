/**
 * CMS webhook endpoint — invalidates knowledge cache and revalidates
 * pages when content changes in the BIB CMS dashboard.
 *
 * Auth: HMAC-SHA256 signature via X-BIB-Signature / X-BIB-Timestamp headers.
 * Env:  CMS_PUSH_SECRET (32-byte hex shared with BIB CMS website record)
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createHmac, timingSafeEqual } from 'crypto';
import { fetchEvents, fetchBooks, fetchFAQs, fetchSiteImages } from '@/lib/cms';

// Optional — only present when concierge bot is deployed
let invalidateKnowledge: (() => void) | undefined;
try {
  invalidateKnowledge = require('@/lib/chat/knowledge').invalidateKnowledge;
} catch {
  // No chatbot module in this deployment
}

const SECRET = process.env.CMS_PUSH_SECRET;
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes replay window

export async function POST(request: Request) {
  if (!SECRET) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 500 });
  }

  const signature = request.headers.get('x-bib-signature');
  const timestamp = request.headers.get('x-bib-timestamp');

  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
  }

  // Replay protection
  const age = Date.now() - Number(timestamp);
  if (isNaN(age) || age > MAX_AGE_MS || age < -MAX_AGE_MS) {
    return NextResponse.json({ error: 'Timestamp expired' }, { status: 401 });
  }

  const body = await request.text();

  // HMAC-SHA256: matches ContentSyncService.signPayload(timestamp + '.' + body, secret)
  const expected = createHmac('sha256', SECRET)
    .update(timestamp + '.' + body)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Invalidate chatbot knowledge cache (if present) + bust Next.js page cache
  invalidateKnowledge?.();
  revalidatePath('/', 'layout');

  // Pre-warm snapshots (fire-and-forget)
  void Promise.all([fetchEvents(), fetchBooks(), fetchFAQs(), fetchSiteImages()]).catch(() => {});

  return NextResponse.json({ success: true, message: 'Content synced' });
}
