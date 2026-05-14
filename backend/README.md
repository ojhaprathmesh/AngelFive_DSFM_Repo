# @angelfive/backend

Express API gateway and orchestration layer for the AngelFive DSFM platform. Acts as the high-availability central bridge between the Next.js frontend, Firebase, external market APIs (SmartAPI, Yahoo Finance), and the heavy-compute ML inference service.

## 🚀 Tech Stack & Engineering

| Layer | Technology |
|---|---|
| Framework | Express 4 + TypeScript |
| Runtime | Node.js ≥ 22 |
| Auth / Data | Firebase Admin SDK (Auth + Firestore) |
| Security | `helmet`, `cors`, `express-rate-limit`, `express-validator` |
| Market APIs | AngelOne SmartAPI, Yahoo Finance |
| Logging | `pino` (Structured JSON) + Redaction Policy |
| Caching | **Redis** (Distributed) + Local SWR Fallback |
| Process | `nodemon -L` (dev), `node dist/server.js` (prod) |

## 🏗️ Architectural Decisions

- **The Gateway Pattern:** The backend isolates the Frontend from third-party APIs. The frontend never possesses API keys for SmartAPI or the ML service. 
- **Redis & SWR Caching:** Due to strict rate limits on third-party financial APIs, the backend aggressively caches quote/candle data and expensive ML computations into Redis using a Stale-While-Revalidate (SWR) strategy.
- **Secure Observability:** Built-in `pino` structured logging automatically enforces redaction policies, stripping Authorization headers, tokens, and password reset links from logs before they hit the terminal or data dog.
- **Domain Event Bus:** Uses an internal `AppEventEmitter` to loosely couple business actions (like logins or watchlist creations) to background notification dispatches.

## 🚦 Local Setup

### 1. Install dependencies
From the **repository root**:
```bash
pnpm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Ensure you provide a running Redis URL, Firebase Admin secrets, and AngelOne API credentials.

### 3. Start the dev server
```bash
pnpm dev
```
The backend runs on `http://localhost:5000` by default.

## 📂 Project Structure

```text
backend/
├── src/
│   ├── server.ts               # App bootstrap, CORS, middleware, route mounts
│   ├── config/
│   │   ├── env.ts              # Typed env validation (throws on missing vars)
│   │   └── firebase.ts         # Firebase Admin initialization
│   ├── routes/
│   │   ├── auth.ts             # OAuth, login, session mgmt
│   │   ├── market.ts           # Redis-cached SmartAPI market discovery
│   │   ├── watchlists.ts       # Watchlist CRUD + SSE stream
│   │   └── dsfm.ts             # Bridge to FastAPI ML Service
│   ├── services/
│   │   ├── event-emitter.ts    # Internal event bus
│   │   └── notification.ts     # Firestore-backed notification manager
│   ├── lib/
│   │   ├── logger.ts           # Pino configuration with strict redaction
│   │   ├── redis.ts            # Redis connection manager
│   │   └── smartapi.ts         # Authenticated SmartAPI client
│   └── utils/
│       └── swrCache.ts         # Redis SWR Cache wrapper logic
├── Dockerfile                  # Multi-stage build (builder → runner)
└── .env.example                # Environment variables
```

## 🔒 Security & Rate Limiting

The backend protects the downstream ML Service and upstream SmartAPI endpoints via rate limits:
- **Global:** 100 requests / minute
- **Auth:** 10 requests / 15 minutes
- **DSFM Compute:** 20 requests / minute

All routes are explicitly typed and validated using `express-validator`.

## 🐳 Docker Deployment

Features a highly optimized multi-stage build:
1. **builder** — Installs deps, compiles TypeScript via `tsconfig.docker.json`.
2. **runner** — Alpine image with only production dependencies and compiled JS.

```bash
# Development (hot-reload via volume mount)
docker compose -f docker-compose.dev.yml up backend

# Production
docker compose up backend
```
