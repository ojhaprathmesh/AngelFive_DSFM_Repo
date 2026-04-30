# AngelFive DSFM Dashboard Frontend

AngelFive DSFM is a full-stack analytics platform designed to democratize advanced Dynamic Statistical Financial Modeling (DSFM) workflows.  
This frontend provides an accessible, intuitive interface that helps users explore forecasts, volatility models, portfolio optimization, and sentiment intelligence without needing to build the ML pipeline themselves.

## Vision

The project aims to make institutional-grade quantitative analytics understandable and usable for a wider audience, including students, retail analysts, and independent researchers.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Runtime & Tooling:** Node.js, npm/pnpm
- **Backend API:** Flask (`ml-service`) for DSFM model endpoints
- **Deep Learning:** PyTorch (LSTM time-series inference)
- **NLP:** HuggingFace Transformers (FinBERT sentiment inference)
- **Statistical Modeling:** ARIMA and GARCH (Python scientific stack)

## Project Preview

- [Insert Screenshot Here]
- [Insert Architecture Diagram Here]

## Prerequisites

- Node.js 18+ (recommended)
- npm or pnpm
- Python 3.10+ for `ml-service`

## Local Setup

### 1) Clone and install frontend dependencies

```bash
cd frontend
npm install
```

### 2) Configure environment variables

Create a `.env.local` file in `frontend/` and configure required values (example):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 3) Start the frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend (`ml-service`) Quick Start

From the repository root:

```bash
cd ml-service
pip install -r requirements.txt
python scripts/init_lstm_weights.py
python app.py
```

Backend defaults to `http://localhost:8000`.

## Key Capabilities Exposed in UI

- DSFM diagnostics (ADF, ACF/PACF)
- Forecasting with ARIMA, GARCH, and PyTorch LSTM
- Portfolio analytics (MPT and Black-Litterman)
- Financial sentiment analysis via FinBERT and rule-based engine

## Production Notes

- FinBERT model weights are downloaded from HuggingFace on first run.
- Ensure outbound internet access is available at startup for initial model pull.
- For repeat deployments, pre-warm model caches or bake artifacts into image layers.
