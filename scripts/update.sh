#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

branch="$(git rev-parse --abbrev-ref HEAD)"

echo "==> Pull latest from origin/${branch}"
git pull --ff-only origin "$branch"

if [[ ! -d node_modules/js-yaml ]]; then
    echo "==> Installing js-yaml (needed for compose merge)"
    npm install --no-save js-yaml@4
fi

echo "==> Merge new keys from templates (without changing existing values)"
node "$ROOT/scripts/update-from-templates.mjs"

echo ""
echo "Update complete. Review changes, then:"
echo "  docker compose pull && docker compose up -d"
