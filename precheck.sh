#!/usr/bin/env bash
# Runs the CI jobs (backend-tests, frontend-lint, frontend-tests) locally
# so you can sanity-check a branch before opening a PR. Fails fast on the
# first error.
#
# Backend runs inside the api container (uv + Python via Docker).
# Frontend runs on the host when Node >= 24 and pnpm are available,
# otherwise falls back to the frontend container. The host path is much
# faster than the bind-mounted container path on macOS — slow enough that
# userEvent interactions in vitest time out under Docker.
#
# Usage: ./precheck.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

step() {
  printf '\n========== %s ==========\n' "$1"
}

require_service() {
  local svc="$1"
  if ! docker compose ps --services --filter status=running | grep -qx "$svc"; then
    echo "Error: the '$svc' container is not running. Start it with: docker compose up -d" >&2
    exit 1
  fi
}

# Frontend execution mode: host (fast) or docker (fallback)
use_host_frontend=0
if command -v node >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1; then
  node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
  if [ "$node_major" -ge 24 ]; then
    use_host_frontend=1
  fi
fi

frontend_run() {
  if [ "$use_host_frontend" -eq 1 ]; then
    (cd frontend && "$@")
  else
    docker compose exec -T frontend "$@"
  fi
}

require_service api
if [ "$use_host_frontend" -eq 0 ]; then
  echo "Note: host pnpm/Node 24 not found — falling back to the frontend container (slower on macOS)."
  require_service frontend
fi

step "backend: ruff check"
docker compose exec -T api uv run ruff check .

step "backend: ruff format --check"
docker compose exec -T api uv run ruff format --check .

step "backend: pytest"
docker compose exec -T api uv run pytest -v --cov=app --cov-report=term-missing

step "frontend: pnpm lint"
frontend_run pnpm lint

step "frontend: pnpm build (type check)"
frontend_run pnpm build

step "frontend: pnpm test:coverage"
frontend_run pnpm test:coverage

printf '\nAll precheck jobs passed.\n'
