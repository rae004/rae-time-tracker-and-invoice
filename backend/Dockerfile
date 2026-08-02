# syntax=docker/dockerfile:1

FROM python:3.13-slim

# Install system dependencies including WeasyPrint requirements
RUN apt-get update && apt-get install -y \
    curl \
    # WeasyPrint dependencies
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fontconfig \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files first for caching. uv.lock has to be among them:
# without it uv resolves the >= ranges in pyproject.toml from scratch and
# writes its own lock, so the committed one — the one that gets audited —
# never governs the image.
COPY pyproject.toml uv.lock .python-version ./

# Install dependencies. --locked installs the lock exactly as committed and
# fails the build if it has drifted from pyproject.toml. Note --frozen is the
# weaker flag: it skips re-resolving but does not verify freshness, so a lock
# that no longer matches pyproject.toml would install stale and pass silently.
RUN uv sync --locked --no-install-project --no-dev

# Copy application code
COPY . .

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_APP=app:create_app

EXPOSE 5000

# Use entrypoint script to handle dev mode with volume mounts
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
