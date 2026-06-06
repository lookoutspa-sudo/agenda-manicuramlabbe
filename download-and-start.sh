#!/usr/bin/env bash
# download-and-start.sh
# Usage: ./download-and-start.sh [--port 10000] [--whatsapp true|false] [--session-path ./server-whatsapp-session]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"

# Defaults
PORT="4000"
WHATSAPP_ENABLED="false"
WHATSAPP_SESSION_PATH="./server-whatsapp-session"

usage() {
  cat <<EOF
Usage: $0 [--port PORT] [--whatsapp true|false] [--session-path PATH]

This script installs server dependencies, ensures a Chromium binary is available (via Playwright),
and starts the server with the provided environment variables.

Examples:
  $0 --port 10000 --whatsapp true --session-path ./my-whatsapp-session

EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"; shift 2;;
    --whatsapp)
      WHATSAPP_ENABLED="$2"; shift 2;;
    --session-path)
      WHATSAPP_SESSION_PATH="$2"; shift 2;;
    -h|--help)
      usage;;
    *)
      echo "Unknown arg: $1"; usage;;
  esac
done

echo "Root: $ROOT_DIR"
echo "Server dir: $SERVER_DIR"
echo "Port: $PORT"
echo "WHATSAPP_ENABLED: $WHATSAPP_ENABLED"
echo "WHATSAPP_SESSION_PATH: $WHATSAPP_SESSION_PATH"

if [ ! -d "$SERVER_DIR" ]; then
  echo "Server directory not found: $SERVER_DIR" >&2
  exit 2
fi

pushd "$SERVER_DIR" >/dev/null

echo "Installing server npm dependencies..."
npm install

echo "Attempting to download Chromium (for Puppeteer) via Playwright..."
# Playwright is used only to download a Chromium binary reliably. This is optional but helpful
# if the runtime where you start the server doesn't already have a Chrome/Chromium binary.
if command -v npx >/dev/null 2>&1; then
  npx --yes playwright install chromium || echo "playwright install failed — you may still have a system Chromium available"
else
  echo "npx not available; skipping Playwright chromium download"
fi

echo "Starting server with environment variables..."
export PORT="$PORT"
export WHATSAPP_ENABLED="$WHATSAPP_ENABLED"
export WHATSAPP_SESSION_PATH="$WHATSAPP_SESSION_PATH"

# Prefer an explicit start script if present
if npm run | grep -q "start"; then
  npm run start
elif npm run | grep -q "start:prod"; then
  npm run start:prod
else
  echo "No npm start script found — launching node directly"
  node src/index.js
fi

popd >/dev/null
