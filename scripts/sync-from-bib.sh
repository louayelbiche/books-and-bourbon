#!/usr/bin/env bash
set -e
BIB_DIR="${BIB_DIR:-$HOME/Documents/Code/runwell-bib}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
TARGET_DIR="$REPO_DIR/local-packages"

if [ ! -d "$BIB_DIR/packages" ]; then
  echo "ERROR: BIB monorepo not found at $BIB_DIR"; exit 1
fi

PACKAGES="
agent-core:agent-core
bot-memory:bot-memory
pidgie-core:pidgie-core
pidgie-shared:pidgie-shared
card-system:card-system
error-handling:error-handling
health:health
logger:logger
i18n:i18n
shared-tools:shared-tools
bib-agent:bib-agent
rag-engine:rag-engine
scraper:scraper
"

echo "=== Syncing BIB packages for Books & Bourbon ==="
mkdir -p "$TARGET_DIR"
synced=0
for entry in $PACKAGES; do
  local_name="${entry%%:*}"
  bib_name="${entry##*:}"
  src="$BIB_DIR/packages/$bib_name"
  dst="$TARGET_DIR/$local_name"
  if [ ! -d "$src" ]; then echo "  SKIP: $bib_name not found"; continue; fi
  rsync -a --delete --exclude='node_modules' --exclude='.turbo' --exclude='dist' --exclude='*.tsbuildinfo' "$src/" "$dst/"
  echo "  Synced: $bib_name -> local-packages/$local_name"
  synced=$((synced + 1))
done
echo "=== Done: $synced packages ==="

# Rewrite workspace:* references in vendored packages to file:../ paths
echo ""
echo "=== Rewriting workspace:* references ==="
find "$TARGET_DIR" -name "package.json" -maxdepth 2 | while read pkg; do
  if grep -q "workspace:\*" "$pkg" 2>/dev/null; then
    # Replace "workspace:*" with "file:../package-name" for @runwell packages
    python3 -c "
import json, re, os
with open('$pkg') as f:
    d = json.load(f)
changed = False
for section in ['dependencies', 'devDependencies', 'peerDependencies']:
    if section not in d: continue
    for k, v in d[section].items():
        if v == 'workspace:*' and k.startswith('@runwell/'):
            pkg_name = k.replace('@runwell/', '')
            d[section][k] = f'file:../{pkg_name}'
            changed = True
if changed:
    with open('$pkg', 'w') as f:
        json.dump(d, f, indent=2)
        f.write('\n')
    print(f'  Rewrote: {os.path.relpath(\"$pkg\", \"$TARGET_DIR\")}')
" 2>/dev/null
  fi
done
echo "=== Rewrite complete ==="
