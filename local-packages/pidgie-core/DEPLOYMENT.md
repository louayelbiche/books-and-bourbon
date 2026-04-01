# BIB Pidgie - Deployment & Secrets Management

> **Owner:** pidgie-core
> **VPS:** 72.62.121.234
> **SSH Key:** ~/.ssh/runwell_vps

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Secrets Management](#secrets-management)
4. [Deploying Clients](#deploying-clients)
5. [Adding New Clients](#adding-new-clients)
6. [Key Rotation](#key-rotation)
7. [Troubleshooting](#troubleshooting)

---

## Overview

BIB Pidgie provides AI-powered chat assistants for client websites. Each client deployment requires access to the Gemini API, which is managed centrally by this package.

**Key Principles:**
- **Single source of truth:** `GEMINI_API_KEY` stored in pidgie-core GitHub secrets
- **Centralized runtime config:** All clients read from `/opt/bib-secrets/.env` on the VPS
- **One update, all clients:** Key rotation only requires updating one file

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              GitHub                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  pidgie-core repo                                                   │  │
│  │  └── Settings → Secrets → GEMINI_API_KEY                             │  │
│  │                           ▲                                           │  │
│  │                           │ Source of truth                           │  │
│  └───────────────────────────┼──────────────────────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────────────────────┘
                               │
                               │ Manual sync via SSH
                               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         VPS (72.62.121.234)                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  /opt/bib-secrets/.env                                               │   │
│  │  ─────────────────────                                               │   │
│  │  GEMINI_API_KEY=AIza...                                              │   │
│  │                                                                       │   │
│  │  Permissions: 700 (dir), 600 (file)                                  │   │
│  │  Owner: root                                                          │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                       │
│              ▼                  ▼                  ▼                       │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐        │
│  │ Toumana           │ │ Hidden Beans      │ │ Future Client     │        │
│  │ (Docker)          │ │ (PM2)             │ │ (Docker/PM2)      │        │
│  │                   │ │                   │ │                   │        │
│  │ docker-compose:   │ │ .env.local:       │ │ env_file:         │        │
│  │ env_file: ────────┤ │ symlink ──────────┤ │ /opt/bib-secrets  │        │
│  │ /opt/bib-secrets  │ │ /opt/bib-secrets  │ │                   │        │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘        │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Secrets Management

### Where Secrets Live

| Location | Purpose |
|----------|---------|
| GitHub Secrets (pidgie-core) | Source of truth for `GEMINI_API_KEY` |
| `/opt/bib-secrets/.env` on VPS | Runtime secrets for all deployed clients |

### Initial Setup

Run once when setting up the VPS or after a fresh install:

```bash
# From pidgie-core/scripts/
./setup-secrets.sh --key "YOUR_GEMINI_API_KEY"
```

Or manually via SSH:

```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234

# Create directory
mkdir -p /opt/bib-secrets
chmod 700 /opt/bib-secrets

# Create secrets file
cat > /opt/bib-secrets/.env << 'EOF'
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
EOF

chmod 600 /opt/bib-secrets/.env
```

### Verify Secrets

```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234 'cat /opt/bib-secrets/.env'
```

---

## Deploying Clients

### Available Scripts

| Script | Purpose |
|--------|---------|
| `./scripts/setup-secrets.sh` | Initialize or update secrets on VPS |
| `./scripts/deploy-client.sh` | Deploy a client to staging or production |

### Deploy Commands

```bash
# Toumana
./scripts/deploy-client.sh toumana staging
./scripts/deploy-client.sh toumana production

# Hidden Beans
./scripts/deploy-client.sh hidden-beans staging
./scripts/deploy-client.sh hidden-beans production
```

### Manual Deployment

#### Toumana (Docker)

```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234

# Staging
cd /opt/toumana-staging
git pull
docker compose -f docker-compose.staging.yml up -d --build

# Production
cd /opt/toumana-website
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

#### Hidden Beans (PM2)

```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234

# Staging
cd /var/www/hidden-beans-staging
git pull
npm run build
pm2 restart hidden-beans-staging

# Production
cd /var/www/hidden-beans
git pull
npm run build
pm2 restart hidden-beans
```

---

## Adding New Clients

### Step 1: Clone Repository on VPS

```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234

cd /opt
git clone https://github.com/org/new-client.git new-client-staging
```

### Step 2: Configure docker-compose.yml

Ensure the client's `docker-compose.staging.yml` includes:

```yaml
services:
  app:
    # ... other config ...
    env_file:
      - /opt/bib-secrets/.env
    environment:
      - NODE_ENV=production
```

### Step 3: Deploy

```bash
cd /opt/new-client-staging
docker compose -f docker-compose.staging.yml up -d --build
```

### Step 4: Add to Deploy Script (Optional)

Edit `scripts/deploy-client.sh` to add the new client:

```bash
case $CLIENT in
    # ... existing clients ...
    new-client)
        if [ "$ENV" = "staging" ]; then
            CLIENT_PATH="/opt/new-client-staging"
        else
            CLIENT_PATH="/opt/new-client"
        fi
        ;;
esac
```

---

## Key Rotation

When the Gemini API key needs to be rotated:

### Step 1: Update GitHub Secret

1. Go to pidgie-core repo → Settings → Secrets
2. Update `GEMINI_API_KEY` with new value

### Step 2: Update VPS

```bash
./scripts/setup-secrets.sh --update --key "NEW_GEMINI_API_KEY"
```

Or manually:

```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234

echo "GEMINI_API_KEY=NEW_GEMINI_API_KEY" > /opt/bib-secrets/.env
chmod 600 /opt/bib-secrets/.env
```

### Step 3: Restart All Clients

```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234 << 'EOF'
# Docker clients
docker restart toumana-staging toumana-website 2>/dev/null || true

# PM2 clients
pm2 restart hidden-beans-staging hidden-beans 2>/dev/null || true
EOF
```

---

## Troubleshooting

### Chat returns "Sorry, I couldn't process your request"

**Cause:** Missing or invalid `GEMINI_API_KEY`

**Check secrets:**
```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234 'cat /opt/bib-secrets/.env'
```

**Check container logs:**
```bash
# Docker
docker logs toumana-staging --tail 50 2>&1 | grep -i gemini

# PM2
pm2 logs hidden-beans-staging --lines 50 | grep -i gemini
```

### Container can't read secrets file

**Cause:** Incorrect file permissions

**Fix:**
```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234 << 'EOF'
chmod 700 /opt/bib-secrets
chmod 600 /opt/bib-secrets/.env
ls -la /opt/bib-secrets/
EOF
```

### Health check fails

**Test endpoints:**
```bash
curl -s https://toumana-staging.runwellsystems.com/api/health
curl -s https://coffee-staging.runwellsystems.com/api/health
```

**Check if container is running:**
```bash
ssh -i ~/.ssh/runwell_vps root@72.62.121.234 << 'EOF'
docker ps | grep toumana
pm2 list | grep hidden-beans
EOF
```

### Docker compose fails with "env_file not found"

**Cause:** Secrets file doesn't exist

**Fix:**
```bash
./scripts/setup-secrets.sh --key "YOUR_GEMINI_API_KEY"
```

---

## Deployed Clients Reference

| Client | Type | Staging | Production |
|--------|------|---------|------------|
| **Toumana** | Docker | https://toumana-staging.runwellsystems.com | https://toumana.runwellsystems.com |
| **Hidden Beans** | PM2 | https://coffee-staging.runwellsystems.com | https://coffee.runwellsystems.com |

### VPS Paths

| Client | Environment | Path |
|--------|-------------|------|
| Toumana | Staging | `/opt/toumana-staging` |
| Toumana | Production | `/opt/toumana-website` |
| Hidden Beans | Staging | `/var/www/hidden-beans-staging` |
| Hidden Beans | Production | `/var/www/hidden-beans` |

### Ports

| Client | Environment | Port |
|--------|-------------|------|
| Toumana | Staging | 9103 |
| Toumana | Production | 3103 |
| Hidden Beans | Staging | 9020 |
| Hidden Beans | Production | 3020 |
