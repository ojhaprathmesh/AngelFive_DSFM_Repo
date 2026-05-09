# @angelfive/backend

Express API gateway and orchestration layer for the AngelFive DSFM platform. Acts as the central bridge between the Next.js frontend, Firebase, external market APIs (SmartAPI, NSE, Yahoo Finance), and the ML inference service.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Express 4 + TypeScript |
| Runtime | Node.js ≥ 22 |
| Auth / Data | Firebase Admin SDK (Auth + Firestore) |
| Security | `helmet`, `cors`, `express-rate-limit`, `express-validator` |
| Market APIs | AngelOne SmartAPI, NSE, Yahoo Finance |
| Logging | `morgan` |
| OTP | `speakeasy` (TOTP for SmartAPI auth) |
| Process | `nodemon` / `tsx` (dev), `node dist/server.js` (prod) |

## Prerequisites

- Node.js ≥ 22
- pnpm ≥ 11 (managed via `corepack`)
- Firebase project with Auth + Firestore enabled
- AngelOne SmartAPI credentials

## Local Setup

### 1. Install dependencies

From the **repository root**:

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in all values — see `.env.example` for the full list (Firebase, SmartAPI, deployment URLs).

### 3. Start the dev server

```bash
pnpm dev
```

The backend runs on `http://localhost:5000` by default.

## Project Structure

```text
backend/
├── src/
│   ├── server.ts               # App bootstrap, CORS, middleware, route mounts
│   ├── config/
│   │   ├── env.ts              # Typed env validation (throws on missing vars)
│   │   └── firebase.ts         # Firebase Admin SDK initialization
│   ├── middleware/
│   │   └── auth.ts             # Centralized verifyToken middleware
│   ├── routes/
│   │   ├── auth.ts             # Login/signup/Google OAuth/password-reset + event emission
│   │   ├── market.ts           # Discovery, quotes, candles, token resolution, cache mgmt
│   │   ├── watchlists.ts       # Watchlist CRUD + SSE stream + symbol mgmt
│   │   ├── notifications.ts    # Notification CRUD + stats + SSE stream
│   │   └── dsfm.ts             # Statistical analytics + ML service bridge
│   ├── services/
│   │   ├── event-emitter.ts    # Singleton AppEventEmitter (domain event bus)
│   │   ├── notification.ts     # NotificationService (Firestore persistence + dedup)
│   │   └── cache.ts            # In-memory SWR cache
│   ├── lib/
│   │   ├── smartapi.ts         # SmartAPI client with TOTP auth
│   │   └── nse.ts              # NSE scraper with cookie bootstrap
│   └── utils/
│       └── mlFetch.ts          # ML service HTTP client with retry (10s→20s→30s)
├── tsconfig.json               # Extends root tsconfig.base.json
├── tsconfig.docker.json        # Self-contained tsconfig for Docker builds
├── Dockerfile                  # Multi-stage build (builder → runner)
└── .env.example                # Environment variable template
```

## API Routes

| Route | Auth | Description |
|---|---|---|
| `POST /api/auth/login` | ✗ | Email/password login → Firebase custom token |
| `POST /api/auth/signup` | ✗ | Account creation + profile bootstrap |
| `POST /api/auth/google` | ✗ | Google OAuth token exchange |
| `GET /api/auth/user/:uid` | ✓ | Fetch user profile |
| `GET /api/market/gainers-losers` | ✗ | Top market movers |
| `GET /api/market/quotes` | ✗ | Real-time quotes |
| `GET /api/market/candles` | ✗ | Historical OHLC data |
| `GET /api/watchlists` | ✓ | List user watchlists |
| `POST /api/watchlists` | ✓ | Create watchlist |
| `GET /api/watchlists/stream` | ✓ | SSE stream for watchlist updates |
| `GET /api/notifications` | ✓ | List notifications (filterable) |
| `GET /api/notifications/stream` | ✓ | SSE stream for real-time notifications |
| `POST /api/notifications/:id/read` | ✓ | Mark notification as read |
| `POST /api/dsfm/adf-test` | ✗ | Augmented Dickey-Fuller test |
| `POST /api/dsfm/acf-pacf` | ✗ | Autocorrelation analysis |
| `POST /api/dsfm/arima` | ✗ | ARIMA forecast |
| `POST /api/dsfm/garch` | ✗ | GARCH volatility model |
| `POST /api/dsfm/mpt` | ✗ | Modern Portfolio Theory optimization |

## Rate Limiting

| Scope | Limit |
|---|---|
| Global | 100 requests / minute |
| Auth endpoints | 10 requests / 15 minutes |
| DSFM compute | 20 requests / minute |

## Docker

Multi-stage Dockerfile with two targets:

1. **builder** — installs deps, compiles TypeScript via `tsconfig.docker.json`
2. **runner** — production Alpine image with only production deps + compiled JS

```bash
# Development (hot-reload via volume mount)
docker compose -f docker-compose.dev.yml up backend

# Production
docker compose up backend
```

## Event System

The backend emits domain events via `AppEventEmitter`:

| Event | Trigger | Side Effect |
|---|---|---|
| `auth.login` | Successful login | "Welcome Back" notification (deduplicated per day) |
| `auth.signup` | New account created | "Welcome to AngelFive" notification |
| `watchlist.created` | Watchlist created | "Watchlist Created" notification |
| `watchlist.symbol_added` | Symbol added to watchlist | "Symbol Added" notification |

Events are consumed by `NotificationService` which writes to Firestore with deduplication and atomic unread count tracking.
