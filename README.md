# Trading212 Portfolio Manager

A portfolio analysis dashboard for Trading212 users. Fetches your positions automatically, enriches them with sector data and financial metrics, and presents everything in a clean dashboard.

## Features

- **Portfolio overview** — Total value, unrealized P&L, cost basis, position count
- **Positions table** — Sortable, searchable, with P&L, weight, P/E, market cap
- **Sector allocation** — Donut chart from OpenFIGI (all stocks) and Tiingo (US stocks)
- **Region allocation** — Donut chart derived from Trading212 ticker suffixes
- **Tiingo coverage analysis** — Dedicated page showing data availability across your portfolio
- **Dark/light mode** — System-aware theme toggle

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **Shadcn/UI** (8 components)
- **TanStack Query** for data fetching/caching
- **Recharts** for charts
- **Zod** for schema validation

## Data Sources

| Provider | Purpose | Coverage | Auth |
|----------|---------|----------|------|
| **Trading212** | Positions + account | Your portfolio | Basic auth (key + secret) |
| **OpenFIGI** | Sector/industry via ISIN | Global | None (free) |
| **Tiingo** | Fundamentals (P/E, market cap) | US stocks (Dow 30 on Power plan) | API key |

## Getting Started

### Prerequisites

- Node.js 18+
- Trading212 API key + secret (Settings → API in the app)
- Tiingo API key (https://api.tiingo.com/)

### Setup

```bash
git clone https://github.com/12ian34/trading212-portfolio-manager.git
cd trading212-portfolio-manager
npm install
cp .env.example .env
# Fill in your API keys in .env
npm run dev
```

Open http://localhost:3000 to see your portfolio.

### Environment Variables

```env
TRADING212_API_KEY=your_api_key
TRADING212_API_SECRET=your_api_secret
TIINGO_API_KEY=your_tiingo_key
```

## Architecture

Three API routes, three hooks, four UI components:

```
Trading212 API  →  /api/portfolio          →  usePortfolio()
OpenFIGI API    →  /api/enrich/sectors     →  useSectorEnrichment()
Tiingo API      →  /api/enrich/fundamentals →  useFundamentals()
```

Client loads positions first, then enriches progressively via TanStack Query.

## Scripts

```bash
npm run dev      # Dev server (Turbopack)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
npm run analyze  # Bundle analysis
```

## License

MIT
