# B&B Production Deployment Checklist

## Current State (Feb 2026)

- **Staging**: `books-staging.runwellsystems.com` — B&B app deployed, BUT subscribe form doesn't work (BIB CMS missing subscribers route)
- **Production**: `books.runwellsystems.com` — running old version, needs full redeploy

## What Works Without CMS

The B&B site uses `fallbackEvents` from `src/app/events/fallback.ts` when the CMS is unavailable. All sections render (hero, featured, upcoming, past reads, suggest a book, footer). Only dynamic features (subscribe, CMS-managed events) are unavailable.

## Prerequisites for Full Production Deploy

### 1. BIB Dashboard — Deploy CMS Subscribers Route (BLOCKER)

The VPS BIB dashboard (`/opt/repos/runwell-bib/apps/web`) is a **monorepo rsync deployment** (not git). It needs a full rebuild to add the subscribers CMS route.

**What's missing on VPS:**
- `apps/web/app/api/cms/v1/subscribers/route.ts` — CMS POST endpoint
- `apps/web/app/api/admin/subscribers/route.ts` — Admin GET (list)
- `apps/web/app/api/admin/subscribers/[id]/route.ts` — Admin DELETE
- `apps/web/lib/sanitize.ts` — input sanitization
- `apps/web/components/dashboard/layout/Sidebar.tsx` — "Subscribers" nav item
- `packages/core/prisma/schema.prisma` — Subscriber model (ALREADY PUSHED to DB)
- `lucide-react` dependency — needed for Sidebar Mail icon

**Why rebuild fails:**
- VPS uses rsync, not git (no `pnpm-workspace.yaml`)
- `npm install` fails on `workspace:*` protocol
- Need pnpm on VPS or rewrite workspace deps to `file:` paths
- `@runwell/bib-cms` export issue (separate from subscribers)

**Fix approach:**
1. Install pnpm on VPS: `npm i -g pnpm`
2. Full rsync of monorepo `packages/` + `apps/web/`
3. Rewrite `workspace:*` → `file:` in all package.jsons
4. `pnpm install` + build
5. Or: use turbo-prune Docker build

### 2. B&B Environment Variables

Create `.env.local` on VPS (both staging and production):

```
CMS_API_URL=http://localhost:3260    # BIB dashboard production port
CMS_API_KEY=ws_live_fEB_W82WeyFPKFkZGEKpppUOB6Te7erSAux26euiJLE
```

**Note**: When B&B moves to its own domain/customer infra, `CMS_API_URL` must point to the BIB dashboard's **public URL** (not localhost), e.g. `https://dashboard.runwellsystems.com`.

### 3. API Key Scopes

The CapitalV API key already has `['read', 'write']` scopes (updated in this session). Verify:

```sql
SELECT "keyPrefix", scopes FROM api_keys
JOIN tenants ON api_keys."tenantId" = tenants.id
WHERE tenants.name = 'CapitalV';
```

### 4. B&B App Deploy

```bash
# Rsync source
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude .env.local \
  /Users/balencia/Documents/Code/books-and-bourbon/ \
  root@72.62.121.234:/opt/books-and-bourbon/

# Install, build, restart
ssh root@72.62.121.234 "cd /opt/books-and-bourbon && npm install && npm run build && pm2 restart books-and-bourbon"
```

### 5. Brand Kit Dependency

The B&B app depends on `@runwell/capitalv-brand-kit` at `/opt/capitalv-brand-kit/` on VPS. The `package.json` path must be rewritten:

```json
"@runwell/capitalv-brand-kit": "file:/opt/capitalv-brand-kit"
```

## Customer Domain Transfer Checklist

When transferring B&B to a customer domain (e.g. `booksandbourbon.com`):

### DNS & SSL
- [ ] Point customer domain A record to VPS IP (72.62.121.234)
- [ ] Add nginx server block for new domain
- [ ] Certbot SSL: `certbot --nginx -d booksandbourbon.com`

### CMS Connection
- [ ] Update `CMS_API_URL` in `.env.local` to BIB dashboard public URL
- [ ] OR set up reverse proxy so `localhost:3260` routes to dashboard
- [ ] Verify API key works from customer domain (CORS headers in CMS route)

### CORS
- [ ] CMS subscribers route uses `getCorsHeaders(origin)` — verify customer domain is allowed
- [ ] If CORS is origin-restricted, add customer domain to allowed origins

### Environment
- [ ] Update `NEXT_PUBLIC_SITE_URL` if used
- [ ] Update OG metadata URLs
- [ ] Update sitemap URLs
- [ ] Verify `trailingSlash: true` in next.config.mjs

### Monitoring
- [ ] Register with BIB Health Monitor: `POST /api/health`
- [ ] Add to site-liveness monitoring (`/opt/scripts/site-liveness.sh`)
- [ ] Verify Telegram alerts configured

### Subscribe Form
- [ ] Verify `/api/subscribe` proxy works from customer domain
- [ ] Test idempotent subscribe (same email twice)
- [ ] Verify subscriber appears in BIB dashboard
