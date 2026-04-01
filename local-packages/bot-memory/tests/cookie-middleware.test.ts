import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVisitorCookieMiddleware } from '../src/visitor/cookie.js';
import type { VisitorProfile } from '../src/visitor/types.js';

function makeProfile(overrides: Partial<VisitorProfile> = {}): VisitorProfile {
  return {
    id: 'visitor-uuid-1',
    visitorKey: 'existing-key',
    visitorType: 'cookie',
    sourceApp: 'test-app',
    tenantId: null,
    facts: [],
    lastConversationSummary: '',
    visitCount: 1,
    totalMessages: 0,
    geoRegion: null,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    ...overrides,
  };
}

describe('createVisitorCookieMiddleware', () => {
  let visitorStore: { getByKey: ReturnType<typeof vi.fn>; getOrCreate: ReturnType<typeof vi.fn> };
  let middleware: ReturnType<typeof createVisitorCookieMiddleware>;

  beforeEach(() => {
    visitorStore = {
      getByKey: vi.fn(),
      getOrCreate: vi.fn(),
    };
    middleware = createVisitorCookieMiddleware(visitorStore as never, {
      sourceApp: 'test-app',
    });
  });

  describe('getOrCreateVisitor', () => {
    it('returns existing visitor from cookie', async () => {
      const profile = makeProfile();
      visitorStore.getByKey.mockResolvedValue(profile);

      const req = new Request('http://localhost', {
        headers: { cookie: 'bot_visitor_id=existing-key' },
      });

      const result = await middleware.getOrCreateVisitor(req);

      expect(result.isNew).toBe(false);
      expect(result.profile.visitorKey).toBe('existing-key');
      expect(visitorStore.getByKey).toHaveBeenCalledWith('existing-key', 'test-app');
    });

    it('creates new visitor when no cookie', async () => {
      const profile = makeProfile({ visitorKey: 'new-uuid' });
      visitorStore.getOrCreate.mockResolvedValue(profile);

      const req = new Request('http://localhost');

      const result = await middleware.getOrCreateVisitor(req);

      expect(result.isNew).toBe(true);
      expect(visitorStore.getOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: expect.objectContaining({
            visitorType: 'cookie',
            sourceApp: 'test-app',
          }),
        })
      );
    });

    it('creates new visitor when cookie exists but profile not found', async () => {
      visitorStore.getByKey.mockResolvedValue(null);
      const profile = makeProfile({ visitorKey: 'orphaned-key' });
      visitorStore.getOrCreate.mockResolvedValue(profile);

      const req = new Request('http://localhost', {
        headers: { cookie: 'bot_visitor_id=orphaned-key' },
      });

      const result = await middleware.getOrCreateVisitor(req);

      // Key is reused from cookie, but profile is new
      expect(result.isNew).toBe(false); // cookie existed
      expect(visitorStore.getOrCreate).toHaveBeenCalled();
    });

    it('passes geoRegion to getOrCreate', async () => {
      visitorStore.getOrCreate.mockResolvedValue(makeProfile({ geoRegion: 'EU' }));

      const req = new Request('http://localhost');
      await middleware.getOrCreateVisitor(req, 'EU');

      expect(visitorStore.getOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ geoRegion: 'EU' })
      );
    });

    it('handles multiple cookies correctly', async () => {
      const profile = makeProfile();
      visitorStore.getByKey.mockResolvedValue(profile);

      const req = new Request('http://localhost', {
        headers: { cookie: 'other=value; bot_visitor_id=existing-key; another=thing' },
      });

      const result = await middleware.getOrCreateVisitor(req);

      expect(result.isNew).toBe(false);
      expect(visitorStore.getByKey).toHaveBeenCalledWith('existing-key', 'test-app');
    });
  });

  describe('setResponseHeaders', () => {
    it('sets httpOnly cookie and x-visitor-id header', () => {
      const headers = new Headers();

      middleware.setResponseHeaders(headers, 'visitor-key-123');

      const cookie = headers.get('set-cookie');
      expect(cookie).toContain('bot_visitor_id=visitor-key-123');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('Max-Age=');

      expect(headers.get('x-visitor-id')).toBe('visitor-key-123');
    });
  });

  describe('custom cookie name', () => {
    it('uses custom cookie name', async () => {
      const customMiddleware = createVisitorCookieMiddleware(visitorStore as never, {
        sourceApp: 'test',
        cookieName: 'my_vid',
      });

      const profile = makeProfile();
      visitorStore.getByKey.mockResolvedValue(profile);

      const req = new Request('http://localhost', {
        headers: { cookie: 'my_vid=custom-key' },
      });

      await customMiddleware.getOrCreateVisitor(req);

      expect(visitorStore.getByKey).toHaveBeenCalledWith('custom-key', 'test');
    });
  });
});
