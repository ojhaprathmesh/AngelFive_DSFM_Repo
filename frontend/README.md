# @angelfive/frontend

Next.js 16 dashboard UI for the AngelFive DSFM platform. Provides market discovery, watchlist management, DSFM analytics, portfolio optimization, and a real-time notification system — all backed by Firebase Auth and the Express backend.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + Radix UI primitives |
| Charts | `lightweight-charts` (TradingView) |
| Auth | Firebase Web SDK (`signInWithCustomToken`) |
| State | React context (`AuthContext`, `NotificationContext`) + SWR |
| Realtime | Server-Sent Events (SSE) via `@microsoft/fetch-event-source` |

## Prerequisites

- Node.js ≥ 22
- pnpm ≥ 11 (managed via `corepack`)

## Local Setup

### 1. Install dependencies

From the **repository root**:

```bash
pnpm install
```

### 2. Configure environment

Copy the template and fill in your values:

```bash
cp .env.example .env
```

See `.env.example` for all required variables (Firebase keys, backend URL, Google Client ID).

### 3. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend proxies API calls to the backend via Next.js rewrites defined in `next.config.ts`.

## Project Structure

```text
frontend/
├── app/
│   ├── login/                  # Login page
│   ├── signup/                 # Signup page
│   └── dashboard/
│       ├── layout.tsx          # Auth-gated dashboard shell + navbar
│       ├── market/             # Market discovery + view-all deep filter
│       ├── watchlist/          # Watchlist CRUD + SSE streaming
│       ├── dsfm/               # DSFM analytics (ADF, ACF/PACF, forecasting)
│       ├── portfolio/          # MPT + Black-Litterman optimization
│       └── notifications/      # Full notification management center
├── components/
│   ├── ui/                     # Reusable design system (Button, Card, Tabs, etc.)
│   ├── dsfm/                   # DSFM-specific chart and analysis components
│   ├── notification-dropdown.tsx # Navbar notification bell + dropdown
│   └── google-signin-button.tsx  # OAuth sign-in component
├── contexts/
│   ├── auth-context.tsx        # User session + inactivity timeout (30 min)
│   └── notification-context.tsx # SSE connection + notification state + actions
├── lib/
│   ├── firebase.ts             # Firebase client init + auth helpers
│   ├── market-data.ts          # Market API client
│   └── watchlists.ts           # Watchlist API client
└── Dockerfile                  # Multi-stage production build (standalone output)
```

## Docker

The frontend ships with a 3-stage Dockerfile:

1. **deps** — installs `node_modules` with pnpm
2. **builder** — runs `next build` for standalone output
3. **runner** — minimal Alpine image serving `node server.js`

Build and run via Docker Compose from the repo root:

```bash
# Development (hot-reload)
docker compose -f docker-compose.dev.yml up frontend

# Production
docker compose up frontend
```

## Key Design Decisions

- **API routing**: Next.js rewrites proxy `/api/*` to the Express backend — the frontend never calls the ML service directly.
- **SSE over WebSocket**: Both watchlist updates and notifications use SSE with token-based auth headers via `@microsoft/fetch-event-source`.
- **Context-only state**: No Redux/Zustand. Auth and notification state live in React context; all other data is fetched on-demand.
