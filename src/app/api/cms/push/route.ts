/**
 * CMS webhook endpoint — invalidates knowledge cache when
 * content changes in the BIB CMS dashboard.
 *
 * Uses the same REVALIDATION_SECRET that B&B already has
 * for ISR revalidation.
 *
 * CMS clients only — skip this file for non-CMS deployments.
 */

import { NextResponse } from 'next/server';
import { invalidateKnowledge } from '@/lib/chat/knowledge';

const SECRET = process.env.REVALIDATION_SECRET;

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-revalidation-secret');
  if (!SECRET || authHeader !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  invalidateKnowledge();

  return NextResponse.json({ success: true, message: 'Knowledge cache invalidated' });
}
