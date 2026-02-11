# B&B Production Deployment Checklist

## Current State (Feb 2026)

- **Staging**: `books-staging.runwellsystems.com` (port 9202) — fully deployed, subscribe works
- **Production**: `books.runwellsystems.com` (port 9201) — running old version, needs redeploy
- **BIB Dashboard**: CMS subscribers route deployed and verified on VPS (port 3260)

## Build Requirements

### Prerequisites

- **Node.js** >= 20
- **npm** (used on VPS, not pnpm — this is a standalone app, not a monorepo)
- **Brand kit**: `@runwell/capitalv-brand-kit` must be available as a local `file:` dependency

### Dependencies

| Package | Purpose |
|---------|---------|
| `next` ^14.2 | Framework |
| `react` / `react-dom` ^18.2 | UI |
| `@iconify/react` ^5.0 | Icons (mdi set) |
| `@runwell/capitalv-brand-kit` | Brand tokens (colors, fonts, logos) |
| `tailwindcss` ^3.4 | Styling |
| `typescript` ^5.3 | Type safety |

### Environment Variables

Create `.env.local` (excluded from rsync, must be created manually on each target):

```
CMS_API_URL=http://localhost:3260    # BIB dashboard on same VPS
CMS_API_KEY=ws_live_fEB_W82WeyFPKFkZGEKpppUOB6Te7erSAux26euiJLE
```

**Both vars are required for:**
- Fetching events/books/FAQs from CMS (`src/lib/cms.ts`)
- Newsletter subscribe proxy (`src/app/api/subscribe/route.ts`)

**Without these vars:** The site renders fully using fallback data from `src/app/events/fallback.ts`. Only dynamic features (subscribe form, CMS-managed events) are unavailable.

### Brand Kit Dependency

Local development:
```json
"@runwell/capitalv-brand-kit": "file:../capitalv-brand-kit"
```

VPS deployment — rewrite to absolute path:
```json
"@runwell/capitalv-brand-kit": "file:/opt/capitalv-brand-kit"
```

The brand kit must be synced to `/opt/capitalv-brand-kit/` on VPS before building B&B.

### CMS API Key Scopes

The CapitalV API key requires `['read', 'write']` scopes:
- `read` — fetch events, books, FAQs
- `write` — subscribe endpoint (POST)

Verify:
```sql
SELECT "keyPrefix", scopes FROM api_keys
JOIN tenants ON api_keys."tenantId" = tenants.id
WHERE tenants.name = 'CapitalV';
```

## CMS Routes Required on BIB Dashboard

The B&B app depends on these BIB CMS routes (all deployed Feb 2026):

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/cms/v1/events` | GET | API key | Fetch events for homepage |
| `/api/cms/v1/books` | GET | API key | Fetch book catalog |
| `/api/cms/v1/faqs` | GET | API key | Fetch FAQ content |
| `/api/cms/v1/subscribers` | POST | API key (write) | Newsletter subscribe |
| `/api/admin/subscribers` | GET | Session auth | Dashboard subscriber list |
| `/api/admin/subscribers/[id]` | DELETE | Session auth | Dashboard subscriber delete |

**BIB Dashboard VPS location:** `/opt/repos/runwell-bib/apps/web/` (port 3260)

**Database:** Prisma schema includes `Subscriber` model with `@@unique([tenantId, email])`. Both staging and production databases have the table and enum created.

## Deployment Steps

### Staging (port 9202)

```bash
# 1. Rsync source
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude .env.local \
  /Users/balencia/Documents/Code/books-and-bourbon/ \
  root@72.62.121.234:/opt/books-and-bourbon-staging/

# 2. Rewrite brand kit path for VPS
ssh root@72.62.121.234 "cd /opt/books-and-bourbon-staging && \
  sed -i 's|file:../capitalv-brand-kit|file:/opt/capitalv-brand-kit|' package.json"

# 3. Install, build, restart
ssh root@72.62.121.234 "cd /opt/books-and-bourbon-staging && \
  npm install && npm run build && pm2 restart books-and-bourbon-staging"
```

### Production (port 9201)

```bash
# 1. Rsync source
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude .env.local \
  /Users/balencia/Documents/Code/books-and-bourbon/ \
  root@72.62.121.234:/opt/books-and-bourbon/

# 2. Rewrite brand kit path for VPS
ssh root@72.62.121.234 "cd /opt/books-and-bourbon && \
  sed -i 's|file:../capitalv-brand-kit|file:/opt/capitalv-brand-kit|' package.json"

# 3. Install, build, restart
ssh root@72.62.121.234 "cd /opt/books-and-bourbon && \
  npm install && npm run build && pm2 restart books-and-bourbon"
```

### Verify After Deploy

```bash
# Health check
curl -s https://books-staging.runwellsystems.com/api/health/ | jq .

# Subscribe test
curl -s -X POST https://books-staging.runwellsystems.com/api/subscribe/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' | jq .
```

## Fallback Data

When CMS is unavailable (no env vars, network issue, CMS down):

- `src/app/events/fallback.ts` — 6 events (2 upcoming + 4 past/recorded)
- `src/app/page.tsx` — uses `fallbackEvents` when `fetchEvents()` returns empty
- All sections render: hero, featured event, upcoming, past reads, suggest a book, footer
- Subscribe form shows "Newsletter service is not configured" (503)

## Customer Domain Transfer Checklist

When transferring B&B to a customer domain (e.g. `booksandbourbon.com`):

### DNS & SSL
- [ ] Point customer domain A record to VPS IP (72.62.121.234)
- [ ] Add nginx server block for new domain
- [ ] Certbot SSL: `certbot --nginx -d booksandbourbon.com`

### CMS Connection
- [ ] Update `CMS_API_URL` in `.env.local` to BIB dashboard public URL (not localhost)
- [ ] e.g. `CMS_API_URL=https://dashboard.runwellsystems.com`
- [ ] Verify API key works from customer domain

### CORS
- [ ] CMS subscribers route uses `getCorsHeaders(origin)` — verify customer domain is allowed
- [ ] If CORS is origin-restricted, add customer domain to allowed origins in BIB dashboard

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
- [ ] Test idempotent subscribe (same email twice → 200 OK, no duplicate)
- [ ] Verify subscriber appears in BIB dashboard under CapitalV tenant
