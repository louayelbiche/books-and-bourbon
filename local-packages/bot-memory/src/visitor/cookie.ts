import type { VisitorStore } from './visitor-store.js';
import type { VisitorIdentity, VisitorProfile } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export interface CookieMiddlewareOptions {
  cookieName?: string;
  cookieMaxAge?: number;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  sourceApp: string;
}

export interface VisitorResult {
  identity: VisitorIdentity;
  profile: VisitorProfile;
  isNew: boolean;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies[name.trim()] = rest.join('=').trim();
  }
  return cookies;
}

export function createVisitorCookieMiddleware(
  visitorStore: VisitorStore,
  options: CookieMiddlewareOptions
) {
  const {
    cookieName = 'bot_visitor_id',
    cookieMaxAge = 365 * 24 * 60 * 60,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax',
    sourceApp,
  } = options;

  return {
    async getOrCreateVisitor(req: Request, geoRegion?: string): Promise<VisitorResult> {
      const cookieHeader = req.headers.get('cookie');
      const cookies = parseCookies(cookieHeader);
      const existingKey = cookies[cookieName];

      if (existingKey) {
        const existing = await visitorStore.getByKey(existingKey, sourceApp);
        if (existing) {
          return {
            identity: {
              visitorKey: existing.visitorKey,
              visitorType: 'cookie',
              sourceApp,
            },
            profile: existing,
            isNew: false,
          };
        }
      }

      const visitorKey = existingKey || uuidv4();
      const identity: VisitorIdentity = {
        visitorKey,
        visitorType: 'cookie',
        sourceApp,
      };
      const profile = await visitorStore.getOrCreate({ identity, geoRegion });

      return { identity, profile, isNew: !existingKey };
    },

    setResponseHeaders(headers: Headers, visitorKey: string): void {
      const parts = [
        `${cookieName}=${visitorKey}`,
        `Max-Age=${cookieMaxAge}`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`,
      ];
      if (secure) parts.push('Secure');
      headers.append('Set-Cookie', parts.join('; '));
      headers.set('x-visitor-id', visitorKey);
    },
  };
}
