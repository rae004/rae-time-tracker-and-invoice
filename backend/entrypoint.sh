#!/bin/bash
set -e

# Install dependencies if .venv doesn't exist (happens with volume mounts)
if [ ! -d "/app/.venv" ]; then
    echo "Installing dependencies..."
    uv sync --no-install-project --no-dev
fi

# Run database migrations
echo "Running database migrations..."
uv run alembic upgrade head

exec "$@"
