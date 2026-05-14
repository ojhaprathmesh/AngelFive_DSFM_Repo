# @angelfive/ml-service

Python-based Machine Learning and Statistical Inference Engine for the AngelFive DSFM platform. Purpose-built to offload heavy blocking computations from the Node.js backend. Provides ARIMA/GARCH forecasting, LSTM neural networks, FinBERT sentiment analysis, and quantitative portfolio optimization.

## 🚀 Tech Stack & Engineering

| Layer | Technology |
|---|---|
| Framework | FastAPI + Pydantic (Strict API Contracts) |
| Production Server | Gunicorn + Uvicorn Workers |
| Language | Python 3.11 |
| Deep Learning | PyTorch (CPU-Optimized) |
| NLP | HuggingFace Transformers (FinBERT) |
| Quantitative | `statsmodels`, `arch`, `scipy`, `pandas` |
| Security | `safetensors` model weights |
| Package Manager | `uv` (Ultra-fast Python dependency management) |

## 🏗️ Architectural Decisions

- **Unblocking Node.js:** Time-series training and NLP inference take seconds to execute. This dedicated Python service prevents the main Express API Gateway from suffering event-loop blocks.
- **FastAPI Pydantic Contracts:** Request validation ensures the backend never sends malformed matrix data to the statistical solvers.
- **Safetensors Over Pickles:** Neural network weights (LSTM, FinBERT) are explicitly configured to load from `.safetensors` files, eliminating arbitrary code execution vulnerabilities common with standard `.pt`/`.pkl` files.
- **Background Warmup:** HuggingFace FinBERT weights (~420 MB) are lazily loaded. A background thread warms up the model instantly upon service boot to eliminate cold-start latency for the first user.

## 🚦 Local Setup

### 1. Create Virtual Environment
Using the highly-performant `uv` package manager:
```bash
cd ml-service
uv venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows
```

### 2. Install Dependencies
```bash
# Install PyTorch CPU directly first to save space
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install service dependencies
uv pip install -r requirements.txt
```

### 3. Start the Dev Server
```bash
fastapi dev src/app.py
# Runs on http://localhost:8000
```

## 📂 Project Structure

```text
ml-service/
├── app.py                      # Application Factory + Lifespan Mgmt
├── src/
│   ├── config.py               # Env validation
│   ├── routes/
│   │   ├── dsfm_routes.py      # Statistical Endpoints (ADF, ARIMA, GARCH)
│   │   ├── forecast_routes.py  # LSTM prediction routes
│   │   ├── health_routes.py    # Readiness probes for CI/CD Smoke tests
│   │   └── model_routes.py     # Diagnostics for memory usage
│   ├── services/
│   │   ├── dsfm_service.py     # Math & stats implementation
│   │   └── sentiment_service.py# NLP pipeline orchestration
│   └── models/
│       └── model_loader.py     # Singleton Thread-Safe Model Cache
├── requirements.in             # Human-readable dependencies
├── requirements.txt            # Compiled lockfile via `uv pip compile`
└── Dockerfile                  # Production container configuration
```

## 🧠 Supported ML & Quant Models

- **ADF (Augmented Dickey-Fuller):** Tests market time-series for stationarity.
- **ARIMA:** Autoregressive Integrated Moving Average forecasting.
- **GARCH:** Volatility clustering and conditional variance modeling.
- **LSTM:** Recurrent Neural Networks natively built in PyTorch for sequential price forecasting.
- **FinBERT:** Pre-trained NLP transformer specifically fine-tuned on financial lexicon for text sentiment.
- **Markowitz & Black-Litterman:** Efficient frontier solvers using SLSQP optimizers from `scipy`.

## 🐳 Docker Deployment

Features a highly optimized production Dockerfile utilizing `uv` for sub-second dependency resolution.

```bash
# Development (hot-reload via uvicorn --reload)
docker compose -f docker-compose.dev.yml up ml-service

# Production (gunicorn with multiple uvicorn workers)
docker compose up ml-service
```
*Note: The production image runs as a non-root user (`appuser`) and securely mounts `/app/model_cache` to persist HuggingFace weights across container restarts.*
