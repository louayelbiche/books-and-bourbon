#!/bin/bash
# =============================================================================
# BIB Pidgie - Setup Secrets
# =============================================================================
#
# Initializes or updates the centralized secrets on the VPS.
# All BIB client deployments reference /opt/bib-secrets/.env
#
# USAGE:
#   ./setup-secrets.sh --key "YOUR_API_KEY"
#   ./setup-secrets.sh --update --key "NEW_API_KEY"
#
# OPTIONS:
#   --key KEY     The GEMINI_API_KEY value (required)
#   --update      Update existing secrets (skip if exists without this flag)
#   --verify      Only verify current secrets, don't modify
#   -h, --help    Show this help message
#
# REQUIREMENTS:
#   - SSH access to VPS via ~/.ssh/runwell_vps
#
# EXAMPLES:
#   # First-time setup
#   ./setup-secrets.sh --key "AIzaSy..."
#
#   # Rotate key
#   ./setup-secrets.sh --update --key "AIzaSy_NEW_KEY..."
#
#   # Check current config
#   ./setup-secrets.sh --verify
#
# =============================================================================

set -e

# Configuration
VPS_HOST="72.62.121.234"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/runwell_vps"
SECRETS_DIR="/opt/bib-secrets"
SECRETS_FILE="$SECRETS_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1" >&2; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

show_help() {
    head -33 "$0" | tail -28 | sed 's/^# //' | sed 's/^#//'
    exit 0
}

# Parse arguments
UPDATE_MODE=false
VERIFY_ONLY=false
API_KEY=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --update)
            UPDATE_MODE=true
            shift
            ;;
        --verify)
            VERIFY_ONLY=true
            shift
            ;;
        --key)
            API_KEY="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    error "SSH key not found: $SSH_KEY"
    exit 1
fi

# Verify-only mode
if [ "$VERIFY_ONLY" = true ]; then
    info "Verifying secrets on VPS..."
    echo ""
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" << 'EOF'
        echo "Directory:"
        ls -la /opt/bib-secrets/ 2>/dev/null || echo "  Not found"
        echo ""
        echo "Secrets file:"
        if [ -f /opt/bib-secrets/.env ]; then
            cat /opt/bib-secrets/.env | sed 's/=.*/=***REDACTED***/'
        else
            echo "  Not found"
        fi
EOF
    exit 0
fi

# Require API key for setup/update
if [ -z "$API_KEY" ]; then
    error "GEMINI_API_KEY not provided"
    echo ""
    echo "Usage: ./setup-secrets.sh --key \"YOUR_API_KEY\""
    echo "       ./setup-secrets.sh --update --key \"NEW_API_KEY\""
    exit 1
fi

# Check if secrets already exist
info "Checking existing configuration..."
EXISTS=$(ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "[ -f $SECRETS_FILE ] && echo 'yes' || echo 'no'")

if [ "$EXISTS" = "yes" ] && [ "$UPDATE_MODE" = false ]; then
    warn "Secrets already configured at $SECRETS_FILE"
    echo ""
    echo "Current config:"
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "cat $SECRETS_FILE | sed 's/=.*/=***REDACTED***/'"
    echo ""
    echo "To update, run: ./setup-secrets.sh --update --key \"NEW_KEY\""
    exit 0
fi

# Setup/Update secrets
if [ "$UPDATE_MODE" = true ]; then
    info "Updating secrets..."
else
    info "Setting up secrets..."
fi

ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" << EOF
    # Create directory with restricted permissions
    mkdir -p $SECRETS_DIR
    chmod 700 $SECRETS_DIR

    # Write secrets file
    cat > $SECRETS_FILE << 'ENVFILE'
# =============================================================================
# BIB Pidgie - Centralized Secrets
# =============================================================================
# Managed by: pidgie-core/scripts/setup-secrets.sh
# Source of truth: pidgie-core GitHub repo secrets
#
# DO NOT EDIT MANUALLY - use setup-secrets.sh --update --key "NEW_KEY"
# =============================================================================

GEMINI_API_KEY=$API_KEY
ENVFILE

    # Restrict permissions
    chmod 600 $SECRETS_FILE
EOF

log "Secrets configured successfully!"
echo ""
echo "Location: $VPS_USER@$VPS_HOST:$SECRETS_FILE"
echo ""
info "All BIB clients should use:"
echo "    env_file:"
echo "      - /opt/bib-secrets/.env"
echo ""
info "To verify: ./setup-secrets.sh --verify"
