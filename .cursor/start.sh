#!/usr/bin/env bash
# Idempotent Cloud Agent start: Vite dev server on port 1420.
set -euo pipefail

cd "$(dirname "$0")/.."

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:1420/; then
  exit 0
fi

exec pnpm dev
