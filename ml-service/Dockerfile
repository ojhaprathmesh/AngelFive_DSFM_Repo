# syntax=docker/dockerfile:1

FROM python:3.11-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install dependencies needed for compiling native packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU first to leverage layer caching and avoid downloading heavy GPU packages
RUN uv pip install --system --no-cache torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the requirements
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# Create a non-root user
RUN addgroup --system appgroup && adduser --system --group appuser

# Set up model cache directory with proper permissions
RUN mkdir -p /app/model_cache && chown -R appuser:appgroup /app/model_cache
ENV TRANSFORMERS_CACHE=/app/model_cache
ENV HF_HOME=/app/model_cache

# Copy application code
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8000

# Production: gunicorn with uvicorn workers (config in gunicorn.conf.py)
CMD ["gunicorn", "app:app", "--config", "gunicorn.conf.py"]
