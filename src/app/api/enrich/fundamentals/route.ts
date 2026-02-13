import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import type { FundamentalsData } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { tickers } = (await request.json()) as { tickers: string[] }

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json({ error: 'tickers array is required' }, { status: 400 })
    }

    const token = env.TIINGO_API_KEY

    // Batch fetch fundamentals meta for all tickers at once
    const tickerList = tickers.join(',')
    const [metaRes, dailyRes] = await Promise.all([
      fetch(
        `https://api.tiingo.com/tiingo/fundamentals/meta?tickers=${tickerList}&token=${token}`
      ),
      // Get latest daily metrics - fetch individually since batch daily doesn't exist
      // We'll use a different approach: fetch meta in batch, daily per-ticker
      Promise.resolve(null), // placeholder
    ])

    // Parse meta response (batch)
    const metaData: Record<string, FundamentalsData> = {}

    if (metaRes.ok) {
      const metaArray = (await metaRes.json()) as Array<{
        ticker?: string
        sector?: string
        industry?: string
        location?: string
        [key: string]: unknown
      }>

      for (const m of metaArray) {
        const t = (m.ticker || '').toUpperCase()
        if (t) {
          metaData[t] = {
            ticker: t,
            sector: typeof m.sector === 'string' && !m.sector.includes('not available')
              ? m.sector
              : 'Unknown',
            industry: typeof m.industry === 'string' && !m.industry.includes('not available')
              ? m.industry
              : 'Unknown',
            location: typeof m.location === 'string' && !m.location.includes('not available')
              ? m.location
              : 'Unknown',
            marketCap: null,
            peRatio: null,
            pbRatio: null,
            enterpriseVal: null,
            pegRatio: null,
          }
        }
      }
    }

    // Fetch daily metrics per ticker (marketCap, peRatio, etc.)
    // Only fetch for tickers we got meta for, limit concurrency
    const tickersWithMeta = Object.keys(metaData)
    const concurrency = 10
    for (let i = 0; i < tickersWithMeta.length; i += concurrency) {
      const batch = tickersWithMeta.slice(i, i + concurrency)
      const dailyPromises = batch.map(async (t) => {
        try {
          const res = await fetch(
            `https://api.tiingo.com/tiingo/fundamentals/${t}/daily?token=${token}`
          )
          if (!res.ok) return
          const data = (await res.json()) as Array<{
            marketCap?: number
            peRatio?: number
            pbRatio?: number
            enterpriseVal?: number
            trailingPEG1Y?: number
            [key: string]: unknown
          }>
          // Get latest entry (last in array)
          const latest = data[data.length - 1]
          if (latest && metaData[t]) {
            metaData[t].marketCap = latest.marketCap ?? null
            metaData[t].peRatio = latest.peRatio ?? null
            metaData[t].pbRatio = latest.pbRatio ?? null
            metaData[t].enterpriseVal = latest.enterpriseVal ?? null
            metaData[t].pegRatio = latest.trailingPEG1Y ?? null
          }
        } catch {
          // Skip failed ticker
        }
      })
      await Promise.all(dailyPromises)
    }

    // Suppress unused variable warning
    void dailyRes

    return NextResponse.json(metaData)
  } catch (error) {
    console.error('Fundamentals enrichment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enrich fundamentals' },
      { status: 500 }
    )
  }
}
