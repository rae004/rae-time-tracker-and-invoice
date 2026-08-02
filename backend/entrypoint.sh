#!/bin/bash
set -e

# Install dependencies if .venv doesn't exist (happens with volume mounts).
# --frozen because /app is bind-mounted in development: an unfrozen sync here
# resolves against the host's pyproject.toml and can rewrite the developer's
# uv.lock on container start. Deliberately --frozen rather than the Dockerfile's
# --locked, so editing pyproject.toml without re-locking does not block startup.
if [ ! -d "/app/.venv" ]; then
    echo "Installing dependencies..."
    uv sync --frozen --no-install-project --no-dev
fi

# Run database migrations
echo "Running database migrations..."
uv run --frozen alembic upgrade head

exec "$@"
