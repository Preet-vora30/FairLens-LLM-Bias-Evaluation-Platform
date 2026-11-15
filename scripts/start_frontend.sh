#!/usr/bin/env bash
# FairLens AI frontend startup script (Linux/macOS)
set -euo pipefail
cd "$(dirname "$0")/../frontend"
npm install
npm run dev
