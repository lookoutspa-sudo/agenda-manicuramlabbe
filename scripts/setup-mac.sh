#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

export PUPPETEER_SKIP_DOWNLOAD=true
export NPM_CONFIG_PUPPETEER_SKIP_DOWNLOAD=true

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Creado .env desde .env.example"
else
  echo ".env ya existe; no se modifica"
fi

mkdir -p server/data

if [ ! -f "client/.env.local" ]; then
  cat > client/.env.local <<'ENV'
VITE_API_URL=http://localhost:4000/api
ENV
  echo "Creado client/.env.local"
else
  echo "client/.env.local ya existe; no se modifica"
fi

echo "Instalando dependencias del backend sin descargar Chromium..."
npm install

echo "Instalando dependencias del frontend..."
npm install --prefix client

echo "Inicializando base de datos..."
npm run seed

echo "Listo. Ejecuta: npm run dev"
