#!/usr/bin/env bash
# FairLens AI backend startup script (Linux/macOS)
set -euo pipefail
cd "$(dirname "$0")/../backend"
if [ ! -d ".venv" ]; then
  python -m venv .venv
fi
source .venv/bin/activate
exec uvicorn app.main:app --host "${BACKEND_HOST:-127.0.0.1}" --port "${BACKEND_PORT:-8000}"
