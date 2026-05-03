# 🏦 AngelFive — DSFM Analytics Dashboard

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=flat-square\&logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Backend-Express.js-blue?style=flat-square\&logo=express)](https://expressjs.com/)
[![Flask](https://img.shields.io/badge/ML--Service-Flask-lightgrey?style=flat-square\&logo=flask)](https://flask.palletsprojects.com/)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch%20%7C%20HuggingFace-EE4C2C?style=flat-square\&logo=pytorch)](https://pytorch.org/)

**AngelFive** is a production-ready financial analytics platform that bridges the gap between raw market data and actionable quantitative insights.

Built using **DSFM (Data Science in Financial Markets)**, it combines real-time data, statistical modeling, machine learning, and portfolio optimization into a unified, broker-style dashboard.

---

## 🚀 Why AngelFive?

Retail investors typically lack access to institutional-grade tools used by hedge funds and quant firms. Most platforms provide charts — but not **decision intelligence**.

**AngelFive solves this by integrating:**

* Statistical validation (ADF, stationarity)
* ML-driven sentiment (FinBERT)
* Time-series forecasting (ARIMA, GARCH, LSTM)
* Portfolio optimization (MPT, Black-Litterman)

👉 All inside a single, real-time dashboard.

---

## ✨ Key Highlights

* 🧠 **Full-stack microservices architecture** (Next.js + Express + Flask)
* 📊 **Real-time + historical data integration** (AngelOne SmartAPI + Yahoo Finance)
* 🤖 **Production-grade ML models** (FinBERT, LSTM, GARCH)
* ⚖️ **Institutional portfolio optimization** (Efficient Frontier + Black-Litterman)
* 🔐 **Secure backend architecture** (no API key exposure to client)
* ⚡ **Optimized performance** with caching and model warmup

---

## 🛠️ Core Features

### 📈 Returns Analysis (DSFM Foundations)

* Augmented Dickey-Fuller (ADF) test for stationarity
* ACF / PACF for lag & seasonality detection
* Volatility modeling using GARCH

### 🎭 Sentiment Analytics

* FinBERT for financial sentiment classification
* Hybrid approach combining rule-based + deep learning signals

### ⚖️ Portfolio Optimization

* Efficient Frontier visualization (Markowitz)
* Black-Litterman model for stable, view-adjusted allocation
* Portfolio constraints for diversification control

---

## 🏗️ Technical Architecture

AngelFive follows a **3-tier microservices architecture** designed for scalability, modularity, and separation of concerns.

### High-Level System Flow

```mermaid
graph TD
    subgraph "Frontend (Next.js 15)"
        Ctx[Auth & UI Contexts]
        UI[Dashboard UI Components]
        State[React Hooks State]
        Viz[SVG/Chart Rendering Engine]

        Ctx -->|Provide Global State| UI
        UI <-->|User Interaction / API Data| State
        State -->|Data-Driven Output| Viz
    end

    subgraph "Backend Gateway (Express.js)"
        Auth[Firebase Admin Auth]
        Router[API Router]
        Cache[Instrument Master Cache]
        Orch[Data Orchestrator]
        MarketSvc[Market & Watchlist Services]

        Router --> Auth
        Router --> Orch
        Router --> MarketSvc
        Orch <-->|Token Lookup| Cache
    end

    subgraph "ML Service (Flask/Python)"
        ML_API[ML API Layer]
        Optim[MPT & Black-Litterman Optimizer]
        TS[ARIMA / GARCH / LSTM Models]
        NLP[FinBERT Sentiment Engine]

        ML_API --> Optim
        ML_API --> TS
        ML_API --> NLP
    end

    subgraph "External Providers"
        A1[AngelOne SmartAPI]
        YF[Yahoo Finance API]
        FB_Auth[Firebase Auth]
        FB_Store[Firebase Firestore]
    end

    UI -->|API Requests| Router

    Orch -->|Historical Data| YF
    Orch -->|Live Market Data| A1
    Orch -->|ML Requests| ML_API

    Cache -->|Pre-fetch Instruments| A1

    Auth <--> FB_Auth
    MarketSvc <-->|Persistence| FB_Store
```

### Architecture Breakdown

1. **Frontend (Next.js 15 + React 19)**

   * Handles UI, state management, and data visualization
   * Uses SVG/chart rendering for financial graphs
   * Maintains global state via React contexts

2. **Backend (Express.js)**

   * Acts as API gateway and orchestration layer
   * Handles authentication via Firebase Admin SDK
   * Manages caching and external API coordination

3. **ML Service (Flask + Python)**

   * Dedicated compute layer for heavy analytics
   * Runs statistical models and ML inference
   * Prevents blocking Node.js event loop

---

## 🚦 Quickstart

### 1. Prerequisites

* Node.js (v20+ recommended)
* Python (3.10+)
* pnpm or npm

---

### 2. Environment Setup

Create `.env` files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ml-service/.env.example ml-service/.env
```

---

### 3. Installation

```bash
# Backend
cd backend && pnpm install

# Frontend
cd ../frontend && pnpm install

# ML Service
cd ../ml-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

### 4. Run the Platform

Start all services:

```bash
# ML Service
python app.py  # http://localhost:8000

# Backend
pnpm dev       # http://localhost:5000

# Frontend
pnpm dev       # http://localhost:3000
```

---

## 🔌 API Overview

### Backend (Express)

* `POST /api/market/smartapi/quote` → Live market data
* `GET /api/watchlist` → Fetch user watchlist
* `POST /api/watchlist` → Update watchlist

### ML Service (Flask)

* `POST /dsfm/sentiment/finbert` → Sentiment analysis
* `POST /dsfm/forecast` → Time-series forecasting
* `POST /dsfm/mpt` → Portfolio optimization
* `GET /dsfm/health` → Service health check

---

## 🧠 Design Decisions & Trade-offs

* **Flask over FastAPI**
  Chosen for simplicity and strong compatibility with PyTorch ecosystem

* **Microservice Separation**
  ML workloads isolated to prevent blocking Node.js event loop

* **SSE over WebSockets**
  Lightweight real-time updates without persistent connection overhead

* **Safetensors vs Pickle**
  Prevents arbitrary code execution from model loading

---

## ⚠️ Limitations

* No full historical backtesting engine yet
* Yahoo Finance data may have slight latency (~15 min)
* ML models are pre-trained (not continuously updated)
* High memory usage when running multiple models simultaneously

---

## 🧪 Testing

* Backend: API testing (planned / extendable)
* Frontend: Component-level testing (React Testing Library)
* ML: Unit validation for statistical models

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Open a pull request

---

## 📝 License

Distributed under the MIT License.

---

**Built for the future of quantitative finance.**
