#!/bin/bash
# =============================================================================
# BIB Pidgie - Deploy Client
# =============================================================================
#
# Deploys a BIB client website to staging or production.
#
# USAGE:
#   ./deploy-client.sh <client> <environment>
#
# CLIENTS:
#   toumana        Jardins de Toumana (Docker)
#   hidden-beans   Hidden Beans Coffee (PM2)
#
# ENVIRONMENTS:
#   staging        Deploy to staging environment
#   production     Deploy to production environment
#
# OPTIONS:
#   --skip-build   Skip the build step (git pull only)
#   --restart      Just restart, no pull or build
#   -h, --help     Show this help message
#
# EXAMPLES:
#   ./deploy-client.sh toumana staging
#   ./deploy-client.sh hidden-beans production
#   ./deploy-client.sh toumana staging --skip-build
#
# =============================================================================

set -e

# Configuration
VPS_HOST="72.62.121.234"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/runwell_vps"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1" >&2; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
step() { echo -e "${BOLD}==> $1${NC}"; }

show_help() {
    head -28 "$0" | tail -23 | sed 's/^# //' | sed 's/^#//'
    exit 0
}

# Get client configuration
get_client_config() {
    local client="$1"
    local env="$2"

    case "$client" in
        toumana)
            DEPLOY_TYPE="docker"
            if [ "$env" = "staging" ]; then
                CLIENT_PATH="/opt/toumana-staging"
                CLIENT_URL="https://toumana-staging.runwellsystems.com"
                COMPOSE_FILE="docker-compose.staging.yml"
            else
                CLIENT_PATH="/opt/toumana-website"
                CLIENT_URL="https://toumana.runwellsystems.com"
                COMPOSE_FILE="docker-compose.prod.yml"
            fi
            ;;
        hidden-beans)
            DEPLOY_TYPE="pm2"
            if [ "$env" = "staging" ]; then
                CLIENT_PATH="/var/www/hidden-beans-staging"
                CLIENT_URL="https://coffee-staging.runwellsystems.com"
                PM2_NAME="hidden-beans-staging"
            else
                CLIENT_PATH="/var/www/hidden-beans"
                CLIENT_URL="https://coffee.runwellsystems.com"
                PM2_NAME="hidden-beans"
            fi
            ;;
        *)
            return 1
            ;;
    esac
    return 0
}

# Parse arguments
CLIENT=""
ENV=""
SKIP_BUILD=false
RESTART_ONLY=false

while [ $# -gt 0 ]; do
    case "$1" in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --restart)
            RESTART_ONLY=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        -*)
            error "Unknown option: $1"
            exit 1
            ;;
        *)
            if [ -z "$CLIENT" ]; then
                CLIENT="$1"
            elif [ -z "$ENV" ]; then
                ENV="$1"
            else
                error "Unexpected argument: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [ -z "$CLIENT" ] || [ -z "$ENV" ]; then
    error "Missing required arguments"
    echo ""
    echo "Usage: ./deploy-client.sh <client> <environment>"
    echo ""
    echo "Clients: toumana, hidden-beans"
    echo "Environments: staging, production"
    exit 1
fi

if [ "$ENV" != "staging" ] && [ "$ENV" != "production" ]; then
    error "Invalid environment: $ENV"
    echo "Must be 'staging' or 'production'"
    exit 1
fi

# Get client config
if ! get_client_config "$CLIENT" "$ENV"; then
    error "Unknown client: $CLIENT"
    echo "Available clients: toumana, hidden-beans"
    exit 1
fi

# Print deployment info
echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  BIB Pidgie - Deploy Client                             ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Client:      $CLIENT"
echo "  Environment: $ENV"
echo "  Deploy Type: $DEPLOY_TYPE"
echo "  Path:        $CLIENT_PATH"
echo "  URL:         $CLIENT_URL"
echo ""

# Verify SSH key
if [ ! -f "$SSH_KEY" ]; then
    error "SSH key not found: $SSH_KEY"
    exit 1
fi

# Step 1: Verify secrets
step "Verifying secrets..."
SECRETS_OK=$(ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "[ -f /opt/bib-secrets/.env ] && echo 'yes' || echo 'no'" 2>/dev/null)
if [ "$SECRETS_OK" != "yes" ]; then
    error "Secrets not configured!"
    echo ""
    echo "Run first: ./setup-secrets.sh --key \"YOUR_GEMINI_API_KEY\""
    exit 1
fi
log "Secrets verified"

# Step 2: Deploy
if [ "$RESTART_ONLY" = true ]; then
    step "Restarting $CLIENT..."

    if [ "$DEPLOY_TYPE" = "docker" ]; then
        CONTAINER_NAME="${CLIENT}-staging"
        [ "$ENV" = "production" ] && CONTAINER_NAME="$CLIENT-website"
        [ "$CLIENT" = "toumana" ] && [ "$ENV" = "staging" ] && CONTAINER_NAME="toumana-staging"
        [ "$CLIENT" = "toumana" ] && [ "$ENV" = "production" ] && CONTAINER_NAME="toumana-website"
        ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "docker restart $CONTAINER_NAME" 2>/dev/null
    else
        ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "pm2 restart $PM2_NAME" 2>/dev/null
    fi

    log "Restarted"
else
    step "Deploying $CLIENT to $ENV..."

    if [ "$DEPLOY_TYPE" = "docker" ]; then
        if [ "$SKIP_BUILD" = true ]; then
            ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "cd $CLIENT_PATH && git pull && docker compose -f $COMPOSE_FILE up -d" 2>/dev/null
        else
            ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "cd $CLIENT_PATH && git pull && docker compose -f $COMPOSE_FILE up -d --build" 2>/dev/null
        fi
    else
        # PM2 deployment
        if [ "$SKIP_BUILD" = true ]; then
            ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "cd $CLIENT_PATH && git pull && pm2 restart $PM2_NAME" 2>/dev/null
        else
            ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "cd $CLIENT_PATH && git pull && npm run build && pm2 restart $PM2_NAME" 2>/dev/null
        fi
    fi

    log "Deployed"
fi

# Step 3: Health check
step "Running health check..."
sleep 5

HEALTH_URL="$CLIENT_URL/api/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log "Health check passed (HTTP $HTTP_CODE)"
else
    warn "Health check returned HTTP $HTTP_CODE"
    echo "  Check manually: curl -s $HEALTH_URL"
fi

# Done
echo ""
echo -e "${GREEN}${BOLD}Deployment complete!${NC}"
echo ""
echo "  URL: $CLIENT_URL"
echo ""
