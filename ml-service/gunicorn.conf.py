#!/usr/bin/env python3
"""Gunicorn configuration for production deployment."""

import os

# Server socket — Render injects PORT env var
host = os.getenv("HOST", "0.0.0.0")
port = os.getenv("PORT", "10000")
bind = f"{host}:{port}"

# FastAPI requires uvicorn worker class
worker_class = "uvicorn.workers.UvicornWorker"

# 1 worker on free-tier to avoid OOM from loading multiple model copies in parallel
workers = 1

# Generous timeout for CPU-bound ML inference (LSTM + FinBERT can exceed 30s)
timeout = 300
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
