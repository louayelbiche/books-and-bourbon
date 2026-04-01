/**
 * Factory for creating session management API route handlers.
 *
 * Provides GET (fetch session data) and DELETE (remove session).
 * Products customize the response shape via a serializer function.
 */

export interface SessionHandlerSessionStore {
  get(id: string): unknown | null;
  delete(id: string): boolean;
  getStats?(): { totalSessions: number; oldestSession: Date | null };
}

export interface CreateSessionHandlerOptions {
  sessionStore: SessionHandlerSessionStore;
  /**
   * Serialize a session object into the JSON response body.
   * Each product defines what fields to expose.
   */
  serialize: (session: unknown) => Record<string, unknown>;
}

export function createSessionHandler(options: CreateSessionHandlerOptions) {
  const { sessionStore, serialize } = options;

  async function GET(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return Response.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      return Response.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    return Response.json(serialize(session as Record<string, unknown>));
  }

  async function DELETE(request: Request): Promise<Response> {
    // Verify Origin header to prevent CSRF
    const origin = request.headers.get('origin');
    const expectedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    if (origin && expectedOrigins.length > 0 && !expectedOrigins.includes(origin)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return Response.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const deleted = sessionStore.delete(sessionId);
    if (!deleted) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  }

  async function HEAD(request: Request): Promise<Response> {
    // Require admin token for metrics exposure
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
        return new Response(null, { status: 200 });
      }
    }

    const stats = sessionStore.getStats?.() ?? { totalSessions: 0, oldestSession: null };
    return new Response(null, {
      status: 200,
      headers: {
        'X-Total-Sessions': stats.totalSessions.toString(),
        'X-Oldest-Session': stats.oldestSession?.toISOString() || 'none',
      },
    });
  }

  return { GET, DELETE, HEAD };
}
