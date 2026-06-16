#!/bin/bash
# Render build script for apps/api
# Copies api source to a clean temp dir with no parent package.json,
# installs deps, builds, then copies dist back.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"

echo "==> Copying api source to isolated build dir: $TMP"
cp -r "$SCRIPT_DIR"/* "$TMP/"
cp "$SCRIPT_DIR"/.env.example "$TMP/" 2>/dev/null || true

echo "==> Installing dependencies"
cd "$TMP"
npm install

echo "==> Building TypeScript"
npm run build

echo "==> Copying dist back"
cp -r "$TMP/dist" "$SCRIPT_DIR/dist"
cp -r "$TMP/node_modules" "$SCRIPT_DIR/node_modules"

echo "==> Build complete"
