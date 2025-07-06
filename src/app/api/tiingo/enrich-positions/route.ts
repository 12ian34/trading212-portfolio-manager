import { NextResponse } from 'next/server'
import { Trading212Position } from '@/lib/types'
import { tiingoClient, TiingoFundamentals } from '@/lib/tiingo-client'
import { tiingoCache } from '@/lib/tiingo-cache'

interface EnrichedPosition extends Trading212Position {
  // Tiingo fundamental data
  companyName?: string
  sector?: string
  industry?: string
  country?: string
  exchange?: string
  marketCap?: number
  peRatio?: number
  eps?: number
  dividendYield?: number
  beta?: number
  description?: string
  // Cache metadata
  isCached?: boolean
  cacheAge?: number
}

// Track hourly API usage - Tiingo free tier: 50 requests/hour
let hourlyRequestCount = 0
let lastResetHour = new Date().getHours()
let lastResetDate = new Date().toDateString()
const MAX_HOURLY_REQUESTS = 45 // Conservative limit for Tiingo free tier (50/hour)

function resetHourlyCountIfNeeded() {
  const now = new Date()
  const currentHour = now.getHours()
  const today = now.toDateString()
  
  // Reset if new hour or new day
  if (currentHour !== lastResetHour || today !== lastResetDate) {
    hourlyRequestCount = 0
    lastResetHour = currentHour
    lastResetDate = today
    console.log('🔄 Hourly Tiingo API request count reset')
  }
}

function convertTicker(trading212Ticker: string): string {
  const symbol = trading212Ticker.split('_')[0]
  
  // Skip symbols known to not work well with Tiingo (mostly UK/EU stocks)
  const skipSymbols = ['FEVRl', 'AAFl', 'JUPl', 'IWGl', 'AIRp', 'BRBYl', 'MONYl', 'ASMLa', 'TSCOl', 'RELl', 'SNl', 'ADMl', 'IHPl', 'SLPLl', 'BAl', 'XIACY', 'DPLMl', 'CKNl', 'HLNl', 'VDPGl']
  
  if (skipSymbols.includes(symbol)) {
    throw new Error(`Skipping ${symbol} - not supported by Tiingo`)
  }
  
  return symbol
}

async function fetchFreshFundamentals(symbol: string): Promise<TiingoFundamentals | null> {
  resetHourlyCountIfNeeded()
  
  if (hourlyRequestCount >= MAX_HOURLY_REQUESTS) {
    console.warn(`⚠️ Hourly Tiingo API limit reached (${hourlyRequestCount}/${MAX_HOURLY_REQUESTS}). Skipping fresh fetch for ${symbol}`)
    return null
  }

  try {
    console.log(`🔍 Fetching fresh Tiingo fundamentals for ${symbol} (${hourlyRequestCount + 1}/${MAX_HOURLY_REQUESTS})`)
    
    const data = await tiingoClient.getCompanyOverview(symbol)
    hourlyRequestCount++

    if (data) {
      // Cache the successful response
      tiingoCache.set(symbol, data)
      console.log(`✅ Successfully fetched and cached ${symbol}`)
      return data
    } else {
      console.warn(`⚠️ No valid data for ${symbol}`)
      tiingoCache.set(symbol, null)
      return null
    }
  } catch (error) {
    console.error(`❌ Error fetching ${symbol}:`, error)
    return null
  }
}

function enrichPositionWithFundamentals(
  position: Trading212Position, 
  overview: TiingoFundamentals | null,
  isCached: boolean = false,
  cacheAge: number = 0
): EnrichedPosition {
  if (!overview) {
    return {
      ...position,
      companyName: position.ticker.split('_')[0],
      sector: 'Unknown',
      industry: 'Unknown',
      country: 'Unknown',
      exchange: 'Unknown',
      isCached,
      cacheAge
    }
  }

  return {
    ...position,
    companyName: overview.name || position.ticker.split('_')[0],
    sector: overview.sector || 'Unknown',
    industry: overview.industry || 'Unknown',
    country: overview.country || 'Unknown',
    exchange: overview.exchange || 'Unknown',
    marketCap: overview.marketCap || undefined,
    peRatio: overview.peRatio && overview.peRatio > 0 ? overview.peRatio : undefined,
    eps: overview.eps && overview.eps > 0 ? overview.eps : undefined,
    dividendYield: overview.dividendYield && overview.dividendYield > 0 ? overview.dividendYield : undefined,
    beta: overview.beta && overview.beta > 0 ? overview.beta : undefined,
    description: overview.description || undefined,
    isCached,
    cacheAge
  }
}

export async function POST(request: Request) {
  try {
    const { positions }: { positions: Trading212Position[] } = await request.json()
    
    if (!positions || positions.length === 0) {
      return NextResponse.json({ error: 'No positions provided' }, { status: 400 })
    }

    console.log(`🚀 Tiingo smart enrichment starting for ${positions.length} positions`)
    
    // Clean up expired cache entries
    tiingoCache.cleanup()
    
    // Get cache stats
    const cacheStats = tiingoCache.getStats()
    console.log(`📊 Tiingo cache stats: ${cacheStats.totalCached} total, ${cacheStats.fresh} fresh, ${cacheStats.cacheHitRate.toFixed(1)}% hit rate`)
    
    resetHourlyCountIfNeeded()
    
    const enrichedPositions: EnrichedPosition[] = []
    const symbolsToFetch: string[] = []
    
    // Step 1: Process all positions, using cache where available
    for (const [index, position] of positions.entries()) {
      try {
        const symbol = convertTicker(position.ticker)
        const cached = tiingoCache.get(symbol)
        
        if (cached) {
          // Use cached data
          const cacheAge = (Date.now() - cached.cachedAt) / (60 * 60 * 1000) // hours
          const enriched = enrichPositionWithFundamentals(position, cached.data, true, cacheAge)
          enrichedPositions.push(enriched)
          console.log(`💾 [${index + 1}/${positions.length}] Using cached data for ${symbol} (${cacheAge.toFixed(1)}h old)`)
        } else {
          // Need fresh data
          symbolsToFetch.push(symbol)
          // Add placeholder for now
          enrichedPositions.push(enrichPositionWithFundamentals(position, null))
          console.log(`🔄 [${index + 1}/${positions.length}] ${symbol} needs fresh data`)
        }
      } catch (error) {
        console.warn(`⏭️ [${index + 1}/${positions.length}] Skipped ${position.ticker}: ${error}`)
        enrichedPositions.push(enrichPositionWithFundamentals(position, null))
      }
    }
    
    // Step 2: Fetch fresh data for symbols not in cache
    const freshDataResults = new Map<string, TiingoFundamentals | null>()
    
    if (symbolsToFetch.length > 0) {
      console.log(`🔍 Fetching fresh data for ${symbolsToFetch.length} symbols (API limit: ${MAX_HOURLY_REQUESTS - hourlyRequestCount} remaining)`)
      
      const maxToFetch = Math.min(symbolsToFetch.length, MAX_HOURLY_REQUESTS - hourlyRequestCount)
      
      for (let i = 0; i < maxToFetch; i++) {
        const symbol = symbolsToFetch[i]
        const freshData = await fetchFreshFundamentals(symbol)
        freshDataResults.set(symbol, freshData)
        
        // Small delay between requests to be respectful (Tiingo is much more generous than Alpha Vantage)
        if (i < maxToFetch - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        }
      }
      
      if (maxToFetch < symbolsToFetch.length) {
        console.warn(`⚠️ Could only fetch ${maxToFetch}/${symbolsToFetch.length} symbols due to daily rate limit`)
      }
    }
    
    // Step 3: Update positions with fresh data
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i]
      try {
        const symbol = convertTicker(position.ticker)
        const freshData = freshDataResults.get(symbol)
        
        if (freshData !== undefined) {
          // Update with fresh data
          enrichedPositions[i] = enrichPositionWithFundamentals(position, freshData, false, 0)
        }
      } catch {
        // Skip - already handled in step 1
      }
    }
    
    // Final stats
    const totalCached = enrichedPositions.filter(p => p.isCached).length
    const totalFresh = enrichedPositions.filter(p => !p.isCached && p.companyName && p.companyName !== p.ticker.split('_')[0]).length
    const totalSkipped = enrichedPositions.filter(p => !p.isCached && p.sector === 'Unknown').length
    
    const summary = {
      totalProcessed: positions.length,
      fromCache: totalCached,
      freshlyFetched: totalFresh,
      skippedOrFailed: totalSkipped,
      dailyApiUsage: `${hourlyRequestCount}/${MAX_HOURLY_REQUESTS}`,
      cacheHitRate: `${((totalCached / positions.length) * 100).toFixed(1)}%`,
      cacheStats: tiingoCache.getStats(),
      provider: 'Tiingo'
    }
    
    console.log(`📋 Tiingo smart enrichment complete:`, summary)
    
    return NextResponse.json({
      enrichedPositions,
      summary
    })
    
  } catch (error) {
    console.error('Tiingo smart enrichment error:', error)
    return NextResponse.json(
      { error: 'Failed to enrich positions with Tiingo' },
      { status: 500 }
    )
  }
} 