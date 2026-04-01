/**
 * Factory for admin conversation query API route handlers.
 *
 * Auth: Bearer token from ADMIN_TOKEN env var.
 * GET actions via ?action= query param: list, get, stats, search, export.
 * POST actions via ?action= query param: cleanup (destructive).
 */

import { timingSafeEqual } from 'crypto';
import type { ConversationQueryEngine } from '../logging/index.js';
import { createLogger, logError } from '@runwell/logger';

const convLogger = createLogger('conversations-handler');

export interface CreateConversationsHandlerOptions {
  queryEngine: ConversationQueryEngine;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function checkAuth(request: Request): Response | null {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return Response.json({ error: 'Admin API not configured' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !safeEqual(authHeader, `Bearer ${adminToken}`)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function createConversationsHandler(options: CreateConversationsHandlerOptions) {
  const { queryEngine } = options;

  async function GET(request: Request): Promise<Response> {
    const authError = checkAuth(request);
    if (authError) return authError;

    try {
      const url = new URL(request.url);
      const action = url.searchParams.get('action') || 'list';

      switch (action) {
        case 'list': {
          const result = queryEngine.list({
            limit: parseInt(url.searchParams.get('limit') || '50'),
            offset: parseInt(url.searchParams.get('offset') || '0'),
            sourceApp: url.searchParams.get('source') || undefined,
            domain: url.searchParams.get('domain') || undefined,
            dateFrom: url.searchParams.get('dateFrom') || undefined,
            dateTo: url.searchParams.get('dateTo') || undefined,
            locale: url.searchParams.get('locale') || undefined,
            minMessages: url.searchParams.get('minMessages')
              ? parseInt(url.searchParams.get('minMessages')!)
              : undefined,
          });
          return Response.json(result);
        }

        case 'get': {
          const id = url.searchParams.get('id');
          if (!id) {
            return Response.json({ error: 'id parameter required' }, { status: 400 });
          }
          const conv = queryEngine.getById(id);
          if (!conv) {
            return Response.json({ error: 'Conversation not found' }, { status: 404 });
          }
          return Response.json(conv);
        }

        case 'stats': {
          const stats = queryEngine.getStats({
            sourceApp: url.searchParams.get('source') || undefined,
            dateFrom: url.searchParams.get('dateFrom') || undefined,
            dateTo: url.searchParams.get('dateTo') || undefined,
          });
          return Response.json(stats);
        }

        case 'search': {
          const query = url.searchParams.get('q');
          if (!query) {
            return Response.json({ error: 'q parameter required' }, { status: 400 });
          }
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const results = queryEngine.searchMessages(query, limit);
          return Response.json({ results, count: results.length });
        }

        case 'export': {
          const data = queryEngine.exportAll();
          return Response.json({ conversations: data, count: data.length });
        }

        default:
          return Response.json(
            { error: `Unknown action: ${action}`, validActions: ['list', 'get', 'stats', 'search', 'export'] },
            { status: 400 }
          );
      }
    } catch (error) {
      convLogger.error('Conversations handler error', logError(error));
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  async function POST(request: Request): Promise<Response> {
    const authError = checkAuth(request);
    if (authError) return authError;

    try {
      const url = new URL(request.url);
      const action = url.searchParams.get('action') || '';

      switch (action) {
        case 'cleanup': {
          const days = parseInt(url.searchParams.get('days') || '30');
          if (days < 1) {
            return Response.json({ error: 'days must be >= 1' }, { status: 400 });
          }
          const deleted = queryEngine.deleteOlderThan(days);
          return Response.json({ deleted, olderThanDays: days });
        }

        default:
          return Response.json(
            { error: `Unknown action: ${action}`, validActions: ['cleanup'] },
            { status: 400 }
          );
      }
    } catch (error) {
      convLogger.error('Conversations handler error', logError(error));
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return { GET, POST };
}
