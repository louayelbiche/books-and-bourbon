#!/usr/bin/env bash
# Dependency security audit.
# Run by the deployment agent on PRs and before every deployment.
# Exit code 1 = high/critical vulnerabilities found (blocks deployment).

set -euo pipefail

cd "$(dirname "$0")/.."

echo "[audit-deps] Running npm audit (high+)..."
npm audit --audit-level=high

echo "[audit-deps] Audit passed. No high/critical vulnerabilities found."
