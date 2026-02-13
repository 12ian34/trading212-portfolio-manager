# CLAUDE.md

This file provides guidance when working with code in this repository.

## Common Development Commands

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint analysis
```

## Architecture Overview

Portfolio dashboard for Trading212 users. Fetches positions from Trading212, enriches with sector data from OpenFIGI (all stocks) and fundamentals from Tiingo (US stocks only).

### Data Flow

```
Trading212 API  →  /api/portfolio         →  Positions + Account
OpenFIGI API    →  /api/enrich/sectors     →  Sector/industry for ALL stocks (via ISIN)
Tiingo API      →  /api/enrich/fundamentals →  P/E, marketCap etc. for US stocks only
```

Client loads positions first, then triggers enrichment in parallel. TanStack Query handles caching.

### API Routes (3 total)

- **`src/app/api/portfolio/route.ts`** - Fetches T212 positions + account via Basic auth. Normalizes nested response into flat `Position` type. Sorts by value descending.
- **`src/app/api/enrich/sectors/route.ts`** - POSTs array of ISINs to OpenFIGI mapping API. Returns `Record<isin, SectorData>`. Batches in groups of 100. Works for all stocks globally.
- **`src/app/api/enrich/fundamentals/route.ts`** - POSTs array of US tickers to Tiingo. Fetches fundamentals/meta (sector, industry, location) + fundamentals/daily (P/E, marketCap, P/B). Returns `Record<ticker, FundamentalsData>`.

### Hooks (1 file, 3 hooks)

- **`src/hooks/use-portfolio.ts`** - `usePortfolio()`, `useSectorEnrichment(isins)`, `useFundamentals(tickers)`. Each is a `useQuery` wrapper. Progressive enrichment: sectors enabled when positions load, fundamentals enabled when US tickers are extracted.

### Components

- **`src/components/portfolio-overview.tsx`** - 4 summary cards: total value, unrealized P&L, total cost, position count.
- **`src/components/positions-table.tsx`** - Sortable/filterable table with search. Shows name, region, sector, value, P&L, weight, P/E, market cap.
- **`src/components/sector-chart.tsx`** - Donut chart of sector allocation from OpenFIGI/Tiingo data.
- **`src/components/region-chart.tsx`** - Donut chart of region allocation derived from T212 ticker suffixes.
- **`src/components/providers.tsx`** - QueryClientProvider + ThemeProvider wrapper.
- **`src/components/theme-toggle.tsx`** / **`theme-provider.tsx`** - Dark/light mode toggle.
- **`src/components/ui/`** - 12 vendored Shadcn/UI components.

### Lib

- **`src/lib/types.ts`** - All types, Zod schemas for T212 API responses, helper functions (`deriveRegion`, `toPlainSymbol`, `isUSStock`).
- **`src/lib/env.ts`** - Zod-validated env vars (server-side only).
- **`src/lib/query-client.ts`** - TanStack Query client config.
- **`src/lib/utils.ts`** - Shadcn `cn()` helper.

## Data Sources

### Trading212 API (v0)

- **Auth**: Basic auth - `base64(API_KEY:API_SECRET)` in Authorization header
- **Base URL**: `https://live.trading212.com/api/v0`
- **Positions**: `GET /equity/positions` - returns nested objects with `instrument`, `walletImpact`
- **Account**: `GET /equity/account/summary` - returns `totalValue`, `cash`, `investments`
- **Docs**: https://docs.trading212.com/api

**Ticker format**: `{SYMBOL}{exchange_suffix}_{MARKET}_EQ`
- US: `AAPL_US_EQ`, `BRK_B_US_EQ`
- UK (LSE): `JUPl_EQ`, `BPl_EQ` (trailing `l`)
- NL (Amsterdam): `ASMLa_EQ` (trailing `a`)
- DE (Frankfurt): `RHMd_EQ` (trailing `d`)
- FR (Paris): `AIRp_EQ` (trailing `p`)

### Tiingo (Power tier - $30/month)

- **Limits**: 100,000 calls/day, 10,000/hour
- **Coverage**: US stocks only (no LSE/Euronext/Frankfurt)
- **Fundamentals meta** (`GET /tiingo/fundamentals/meta?tickers=X`): sector, industry, location, SIC codes
- **Fundamentals daily** (`GET /tiingo/fundamentals/{ticker}/daily`): marketCap, peRatio, pbRatio, enterpriseVal, PEG
- **Coverage tested**: 90/131 portfolio positions found (all US stocks). 41 UK/EU missing.

### OpenFIGI (free, unlimited)

- **Auth**: None required (25 req/min unauthenticated, 100 with free API key)
- **Endpoint**: `POST https://api.openfigi.com/v3/mapping`
- **Input**: Array of `{idType: "ID_ISIN", idValue: "US0378331005"}`
- **Returns**: marketSector, securityType, exchCode, name, FIGI
- **Coverage**: Global - works for all stocks via ISIN

## Environment Variables

```env
TRADING212_API_KEY=your_api_key
TRADING212_API_SECRET=your_api_secret
TIINGO_API_KEY=your_tiingo_key
```

See `.env.example`. Validated by `src/lib/env.ts` using Zod (server-side only).

## Technical Stack

- **Next.js 15** with App Router + Turbopack
- **React 19**
- **TypeScript 5** (strict)
- **Tailwind CSS 4** (via postcss, no tailwind.config)
- **Shadcn/UI** (new-york style, 12 components)
- **TanStack Query** for data fetching/caching
- **Zod** for schema validation
- **Recharts** for charts
- **Lucide React** for icons

## Import Alias

`@/` maps to `src/`

## Test Data

- `trading212-positions.json` - 131 real positions (gitignored)
- `trading212-account.json` - account summary (gitignored)
