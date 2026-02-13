import { NextRequest, NextResponse } from 'next/server'
import type { SectorData } from '@/lib/types'

// OpenFIGI API - free, no key required (25 req/min unauthenticated)
const OPENFIGI_URL = 'https://api.openfigi.com/v3/mapping'

interface OpenFIGIJob {
  idType: string
  idValue: string
}

interface OpenFIGIResult {
  data?: Array<{
    ticker?: string
    name?: string
    marketSector?: string
    securityType?: string
    exchCode?: string
    figi?: string
    compositeFIGI?: string
  }>
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { isins } = (await request.json()) as { isins: string[] }

    if (!isins || !Array.isArray(isins) || isins.length === 0) {
      return NextResponse.json({ error: 'isins array is required' }, { status: 400 })
    }

    // OpenFIGI accepts up to 100 jobs per request
    const results: Record<string, SectorData> = {}
    const batchSize = 100

    for (let i = 0; i < isins.length; i += batchSize) {
      const batch = isins.slice(i, i + batchSize)
      const jobs: OpenFIGIJob[] = batch.map((isin) => ({
        idType: 'ID_ISIN',
        idValue: isin,
      }))

      const res = await fetch(OPENFIGI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobs),
      })

      if (!res.ok) {
        console.error(`OpenFIGI returned ${res.status}`)
        continue
      }

      const figiResults: OpenFIGIResult[] = await res.json()

      figiResults.forEach((result, idx) => {
        const isin = batch[idx]
        if (result.data && result.data.length > 0) {
          // Pick the first result (usually the primary listing)
          const best = result.data[0]
          // Note: OpenFIGI marketSector is asset class ("Equity", "Govt" etc.)
          // not business sector. Real business sectors come from Tiingo (US only).
          results[isin] = {
            sector: best.marketSector || 'Unknown',
            industry: best.securityType || 'Unknown',
            marketSector: best.marketSector || 'Unknown',
            exchCode: best.exchCode || 'Unknown',
            name: best.name || '',
          }
        }
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Sector enrichment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enrich sectors' },
      { status: 500 }
    )
  }
}
