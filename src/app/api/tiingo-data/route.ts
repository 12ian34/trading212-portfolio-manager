import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

interface TiingoEntry {
  t212_ticker: string
  plain_symbol: string
  name: string
  isin: string
  currency: string
  currentValue: number
  tiingo_found: boolean
  tiingo_error?: string
  tiingo_meta?: {
    name: string | null
    exchange: string | null
    description: string | null
    startDate: string | null
    endDate: string | null
  }
}

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'tiingo-all-stocks.json')
    const raw = readFileSync(filePath, 'utf-8')
    const data: Record<string, TiingoEntry> = JSON.parse(raw)

    const entries = Object.values(data)
    const found = entries.filter((e) => e.tiingo_found)
    const missing = entries.filter((e) => !e.tiingo_found)

    // Exchange breakdown
    const exchangeMap = new Map<string, { count: number; value: number; stocks: string[] }>()
    for (const e of found) {
      const ex = e.tiingo_meta?.exchange || 'Unknown'
      const existing = exchangeMap.get(ex) || { count: 0, value: 0, stocks: [] }
      existing.count++
      existing.value += e.currentValue
      existing.stocks.push(e.plain_symbol)
      exchangeMap.set(ex, existing)
    }
    const exchanges = Array.from(exchangeMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)

    // Currency breakdown for missing
    const currencyMap = new Map<string, { count: number; value: number; stocks: string[] }>()
    for (const e of missing) {
      const c = e.currency
      const existing = currencyMap.get(c) || { count: 0, value: 0, stocks: [] }
      existing.count++
      existing.value += e.currentValue
      existing.stocks.push(e.plain_symbol)
      currencyMap.set(c, existing)
    }
    const missingByCurrency = Array.from(currencyMap.entries())
      .map(([currency, data]) => ({ currency, ...data }))
      .sort((a, b) => b.value - a.value)

    // All entries sorted by value
    const allEntries = entries
      .map((e) => ({
        ticker: e.t212_ticker,
        symbol: e.plain_symbol,
        name: e.name,
        isin: e.isin,
        currency: e.currency,
        value: e.currentValue,
        found: e.tiingo_found,
        exchange: e.tiingo_meta?.exchange || null,
        description: e.tiingo_meta?.description || null,
        error: e.tiingo_error || null,
      }))
      .sort((a, b) => b.value - a.value)

    return NextResponse.json({
      summary: {
        total: entries.length,
        found: found.length,
        missing: missing.length,
        foundValue: Math.round(found.reduce((s, e) => s + e.currentValue, 0) * 100) / 100,
        missingValue: Math.round(missing.reduce((s, e) => s + e.currentValue, 0) * 100) / 100,
        totalValue: Math.round(entries.reduce((s, e) => s + e.currentValue, 0) * 100) / 100,
        coveragePercent: Math.round((found.length / entries.length) * 1000) / 10,
        valueCoveragePercent:
          Math.round(
            (found.reduce((s, e) => s + e.currentValue, 0) /
              entries.reduce((s, e) => s + e.currentValue, 0)) *
              1000
          ) / 10,
      },
      exchanges,
      missingByCurrency,
      stocks: allEntries,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read tiingo data' },
      { status: 500 }
    )
  }
}
