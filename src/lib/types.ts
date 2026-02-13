import { z } from 'zod'

// ---------------------------------------------------------------------------
// Trading212 API response schemas (v0 - new shape)
// ---------------------------------------------------------------------------

export const T212RawPositionSchema = z.object({
  instrument: z.object({
    ticker: z.string(),
    name: z.string(),
    isin: z.string(),
    currency: z.string(),
  }),
  createdAt: z.string(),
  quantity: z.number(),
  quantityAvailableForTrading: z.number(),
  quantityInPies: z.number(),
  currentPrice: z.number(),
  averagePricePaid: z.number(),
  walletImpact: z.object({
    currency: z.string(),
    totalCost: z.number(),
    currentValue: z.number(),
    unrealizedProfitLoss: z.number(),
    fxImpact: z.number().nullable(),
  }),
})

export const T212AccountSchema = z.object({
  id: z.number(),
  currency: z.string(),
  totalValue: z.number(),
  cash: z.object({
    availableToTrade: z.number(),
    reservedForOrders: z.number(),
    inPies: z.number(),
  }),
  investments: z.object({
    currentValue: z.number(),
    totalCost: z.number(),
    realizedProfitLoss: z.number(),
    unrealizedProfitLoss: z.number(),
  }),
})

// ---------------------------------------------------------------------------
// Normalized position (flat, easy to consume in UI)
// ---------------------------------------------------------------------------

export interface Position {
  // Identity
  ticker: string        // Raw T212 ticker e.g. "AAPL_US_EQ"
  symbol: string        // Plain symbol e.g. "AAPL"
  name: string
  isin: string
  currency: string      // Instrument currency e.g. "USD", "GBX"

  // Holding
  quantity: number
  currentPrice: number  // In instrument currency
  averagePricePaid: number

  // Wallet impact (in account currency, e.g. GBP)
  walletCurrency: string
  totalCost: number
  currentValue: number
  unrealizedPnL: number
  fxImpact: number | null

  // Derived
  pnlPercent: number    // unrealizedPnL / totalCost * 100
  weight: number        // Will be set after all positions loaded (% of portfolio)
  region: string        // Derived from ticker suffix: "US", "UK", "NL", "DE", "FR", "Other"

  // Enrichment (filled later)
  sector?: string
  industry?: string
  marketCap?: number
  peRatio?: number
  pbRatio?: number
  enterpriseVal?: number

  createdAt: string
}

export interface Account {
  id: number
  currency: string
  totalValue: number
  availableToTrade: number
  investmentsValue: number
  totalCost: number
  realizedPnL: number
  unrealizedPnL: number
}

export interface PortfolioData {
  account: Account
  positions: Position[]
}

// ---------------------------------------------------------------------------
// OpenFIGI sector enrichment
// ---------------------------------------------------------------------------

export interface SectorData {
  sector: string
  industry: string
  marketSector: string
  exchCode: string
  name: string
}

// ---------------------------------------------------------------------------
// Tiingo fundamentals enrichment
// ---------------------------------------------------------------------------

export interface FundamentalsData {
  ticker: string
  sector: string
  industry: string
  location: string
  marketCap: number | null
  peRatio: number | null
  pbRatio: number | null
  enterpriseVal: number | null
  pegRatio: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive region from a T212 ticker like "AAPL_US_EQ" or "JUPl_EQ" */
export function deriveRegion(ticker: string): string {
  if (ticker.includes('_US_')) return 'US'
  const base = ticker.replace('_EQ', '')
  const last = base.charAt(base.length - 1)
  switch (last) {
    case 'l': return 'UK'
    case 'a': return 'NL'
    case 'd': return 'DE'
    case 'p': return 'FR'
    default: return 'Other'
  }
}

/** Convert T212 ticker to a plain symbol for Tiingo lookups (US stocks only) */
export function toPlainSymbol(ticker: string): string {
  // "AAPL_US_EQ" → "AAPL", "BRK_B_US_EQ" → "BRK.B"
  const withoutEq = ticker.replace('_EQ', '')
  if (withoutEq.includes('_US')) {
    const parts = withoutEq.replace('_US', '').split('_')
    return parts.join('.')
  }
  // Non-US: strip trailing exchange letter
  return withoutEq.replace(/[ladp]$/, '')
}

/** Check if a T212 ticker is a US stock */
export function isUSStock(ticker: string): boolean {
  return ticker.includes('_US_')
}
