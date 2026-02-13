import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import {
  T212RawPositionSchema,
  T212AccountSchema,
  deriveRegion,
  type Position,
  type Account,
  type PortfolioData,
} from '@/lib/types'

function basicAuthHeader(): string {
  const credentials = Buffer.from(
    `${env.TRADING212_API_KEY}:${env.TRADING212_API_SECRET}`
  ).toString('base64')
  return `Basic ${credentials}`
}

const T212_BASE = 'https://live.trading212.com/api/v0'

async function fetchT212<T>(path: string): Promise<T> {
  const res = await fetch(`${T212_BASE}${path}`, {
    headers: { Authorization: basicAuthHeader() },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Trading212 ${path} returned ${res.status}: ${text}`)
  }
  return res.json()
}

export async function GET() {
  try {
    const [rawPositions, rawAccount] = await Promise.all([
      fetchT212<unknown[]>('/equity/positions'),
      fetchT212<unknown>('/equity/account/summary'),
    ])

    const account = T212AccountSchema.parse(rawAccount)

    const parsed = rawPositions.map((p) => T212RawPositionSchema.parse(p))

    // Calculate total portfolio value for weight calculation
    const totalValue = parsed.reduce((sum, p) => sum + p.walletImpact.currentValue, 0)

    const positions: Position[] = parsed.map((p) => {
      const pnlPercent =
        p.walletImpact.totalCost !== 0
          ? (p.walletImpact.unrealizedProfitLoss / p.walletImpact.totalCost) * 100
          : 0

      return {
        ticker: p.instrument.ticker,
        symbol: p.instrument.ticker.replace('_EQ', '').replace(/_US$/, '').replace(/[ladp]$/, ''),
        name: p.instrument.name,
        isin: p.instrument.isin,
        currency: p.instrument.currency,
        quantity: p.quantity,
        currentPrice: p.currentPrice,
        averagePricePaid: p.averagePricePaid,
        walletCurrency: p.walletImpact.currency,
        totalCost: p.walletImpact.totalCost,
        currentValue: p.walletImpact.currentValue,
        unrealizedPnL: p.walletImpact.unrealizedProfitLoss,
        fxImpact: p.walletImpact.fxImpact,
        pnlPercent,
        weight: totalValue > 0 ? (p.walletImpact.currentValue / totalValue) * 100 : 0,
        region: deriveRegion(p.instrument.ticker),
        createdAt: p.createdAt,
      }
    })

    // Sort by value descending
    positions.sort((a, b) => b.currentValue - a.currentValue)

    const accountNormalized: Account = {
      id: account.id,
      currency: account.currency,
      totalValue: account.totalValue,
      availableToTrade: account.cash.availableToTrade,
      investmentsValue: account.investments.currentValue,
      totalCost: account.investments.totalCost,
      realizedPnL: account.investments.realizedProfitLoss,
      unrealizedPnL: account.investments.unrealizedProfitLoss,
    }

    const data: PortfolioData = { account: accountNormalized, positions }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Portfolio fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch portfolio' },
      { status: 500 }
    )
  }
}
