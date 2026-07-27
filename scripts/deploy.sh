#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git pull
docker compose up -d --build

echo "XP desktop deployed — http://127.0.0.1:3003"
