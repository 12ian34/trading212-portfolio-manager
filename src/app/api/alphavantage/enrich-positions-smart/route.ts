import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { Trading212Position, AlphaVantageOverview } from '@/lib/types'
import { alphaVantageCache } from '@/lib/alphavantage-cache'

interface EnrichedPosition extends Trading212Position {
  // Alpha Vantage fundamental data
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
  cacheAge?: number // in hours
}

// Track daily API usage (resets at midnight)
let dailyRequestCount = 0
let lastResetDate = new Date().toDateString()
const MAX_DAILY_REQUESTS = 20 // Conservative limit

function resetDailyCountIfNeeded() {
  const today = new Date().toDateString()
  if (today !== lastResetDate) {
    dailyRequestCount = 0
    lastResetDate = today
    console.log('🔄 Daily API request count reset')
  }
}

function convertTicker(trading212Ticker: string): string {
  const symbol = trading212Ticker.split('_')[0]
  
  // Skip symbols known to not work with Alpha Vantage
  const skipSymbols = ['FEVRl', 'AAFl', 'JUPl', 'IWGl', 'AIRp', 'BRBYl', 'MONYl', 'ASMLa', 'TSCOl', 'RELl', 'SNl', 'ADMl', 'IHPl', 'SLPLl', 'BAl', 'XIACY', 'DPLMl', 'CKNl', 'HLNl', 'VDPGl']
  
  if (skipSymbols.includes(symbol)) {
    throw new Error(`Skipping ${symbol} - not supported by Alpha Vantage`)
  }
  
  return symbol
}

async function fetchFreshFundamentals(symbol: string): Promise<AlphaVantageOverview | null> {
  resetDailyCountIfNeeded()
  
  if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
    console.warn(`⚠️ Daily API limit reached (${dailyRequestCount}/${MAX_DAILY_REQUESTS}). Skipping fresh fetch for ${symbol}`)
    return null
  }

  try {
    console.log(`🔍 Fetching fresh fundamentals for ${symbol} (${dailyRequestCount + 1}/${MAX_DAILY_REQUESTS})`)
    
    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${env.ALPHAVANTAGE_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`)
    }

    const data = await response.json()
    dailyRequestCount++

    // Check for API errors
    if (data.Note && data.Note.includes('API call frequency')) {
      console.warn(`⚠️ Rate limit hit for ${symbol}`)
      return null
    }

    if (data.Information && data.Information.includes('Invalid API call')) {
      console.warn(`⚠️ Invalid symbol: ${symbol}`)
      // Cache null result to avoid retrying
      alphaVantageCache.set(symbol, null)
      return null
    }

    // Check if we got valid data
    if (!data.Symbol || Object.keys(data).length < 5) {
      console.warn(`⚠️ No valid data for ${symbol}`)
      alphaVantageCache.set(symbol, null)
      return null
    }

    // Cache the successful response
    alphaVantageCache.set(symbol, data)
    console.log(`✅ Successfully fetched and cached ${symbol}`)
    return data
  } catch (error) {
    console.error(`❌ Error fetching ${symbol}:`, error)
    return null
  }
}

function enrichPositionWithFundamentals(
  position: Trading212Position, 
  overview: AlphaVantageOverview | null,
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

  const marketCap = overview.MarketCapitalization ? parseInt(overview.MarketCapitalization) || undefined : undefined
  const peRatio = overview.PERatio && overview.PERatio !== 'None' ? parseFloat(overview.PERatio) || undefined : undefined
  const eps = overview.EPS && overview.EPS !== 'None' ? parseFloat(overview.EPS) || undefined : undefined
  const dividendYield = overview.DividendYield && overview.DividendYield !== 'None' ? parseFloat(overview.DividendYield) || undefined : undefined
  const beta = overview.Beta && overview.Beta !== 'None' ? parseFloat(overview.Beta) || undefined : undefined

  return {
    ...position,
    companyName: overview.Name || position.ticker.split('_')[0],
    sector: overview.Sector || 'Unknown',
    industry: overview.Industry || 'Unknown',
    country: overview.Country || 'Unknown',
    exchange: overview.Exchange || 'Unknown',
    marketCap,
    peRatio,
    eps,
    dividendYield,
    beta,
    description: overview.Description || undefined,
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

    console.log(`🚀 Smart enrichment starting for ${positions.length} positions`)
    
    // Clean up expired cache entries
    alphaVantageCache.cleanup()
    
    // Get cache stats
    const cacheStats = alphaVantageCache.getStats()
    console.log(`📊 Cache stats: ${cacheStats.totalCached} total, ${cacheStats.fresh} fresh, ${cacheStats.cacheHitRate.toFixed(1)}% hit rate`)
    
    resetDailyCountIfNeeded()
    
    const enrichedPositions: EnrichedPosition[] = []
    const symbolsToFetch: string[] = []
    
    // Step 1: Process all positions, using cache where available
    for (const [index, position] of positions.entries()) {
      try {
        const symbol = convertTicker(position.ticker)
        const cached = alphaVantageCache.get(symbol)
        
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
    
    // Step 2: Fetch fresh data for symbols not in cache (respecting rate limits)
    const freshDataResults = new Map<string, AlphaVantageOverview | null>()
    
    if (symbolsToFetch.length > 0) {
      console.log(`🔍 Fetching fresh data for ${symbolsToFetch.length} symbols (API limit: ${MAX_DAILY_REQUESTS - dailyRequestCount} remaining)`)
      
      const maxToFetch = Math.min(symbolsToFetch.length, MAX_DAILY_REQUESTS - dailyRequestCount)
      
      for (let i = 0; i < maxToFetch; i++) {
        const symbol = symbolsToFetch[i]
        const freshData = await fetchFreshFundamentals(symbol)
        freshDataResults.set(symbol, freshData)
        
        // Add delay between requests to avoid rate limiting
        if (i < maxToFetch - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
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
      dailyApiUsage: `${dailyRequestCount}/${MAX_DAILY_REQUESTS}`,
      cacheHitRate: `${((totalCached / positions.length) * 100).toFixed(1)}%`,
      cacheStats: alphaVantageCache.getStats()
    }
    
    console.log(`📋 Smart enrichment complete:`, summary)
    
    return NextResponse.json({
      enrichedPositions,
      summary
    })
    
  } catch (error) {
    console.error('Smart enrichment error:', error)
    return NextResponse.json(
      { error: 'Failed to enrich positions' },
      { status: 500 }
    )
  }
} 