#!/bin/bash
set -euo pipefail

# Load agent-specific env vars (APP_PORT, VITE_PORT, DB_DATABASE, etc.)
if [ -f .env ]; then
  set -o allexport
  # shellcheck source=/dev/null
  source .env
  set +o allexport
fi

APP_PORT="${APP_PORT:-8000}"
VITE_PORT="${VITE_PORT:-5173}"

if ! command -v overmind &>/dev/null; then
  echo "❌ Overmind not found. Install with: brew install overmind"
  exit 1
fi

if [ ! -f Procfile.dev ]; then
  echo "❌ Procfile.dev not found. Make sure you are inside the sushigo repo root."
  exit 1
fi

echo ""
echo "🚀 Starting agent workspace"
echo "   Backend  → http://127.0.0.1:${APP_PORT}"
echo "   Frontend → http://localhost:${VITE_PORT}"
echo ""

overmind start -f Procfile.dev
