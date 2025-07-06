import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { Trading212Position, AlphaVantageOverview } from '@/lib/types'

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
}

// Enhanced cache for Alpha Vantage data (7 day cache for rate limit management)
const fundamentalsCache = new Map<string, { data: AlphaVantageOverview | null, expiresAt: number }>()
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

// More conservative rate limiting for Alpha Vantage (3 calls per minute instead of 5)
const requestQueue: Array<() => Promise<void>> = []
let isProcessingQueue = false
const RATE_LIMIT_DELAY = 20000 // 20 seconds between requests (3 per minute)

// Track daily request count to prevent hitting daily limits
let dailyRequestCount = 0
const MAX_DAILY_REQUESTS = 25 // Conservative limit for free tier
const dailyResetTime = new Date()
dailyResetTime.setHours(0, 0, 0, 0)

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return
  
  isProcessingQueue = true
  
  while (requestQueue.length > 0) {
    // Check if we've hit daily limits
    if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
      console.warn(`⚠️ Daily Alpha Vantage request limit reached (${dailyRequestCount}/${MAX_DAILY_REQUESTS}). Stopping enrichment.`)
      break
    }
    
    const request = requestQueue.shift()
    if (request) {
      try {
        await request()
        dailyRequestCount++
        
        // Wait between requests to respect rate limit
        if (requestQueue.length > 0) {
          console.log(`⏳ Waiting ${RATE_LIMIT_DELAY/1000}s before next Alpha Vantage request (${dailyRequestCount}/${MAX_DAILY_REQUESTS} daily)`)
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
        }
      } catch (error) {
        console.error('Queue request error:', error)
        
        // If we hit rate limits, stop processing and clear queue
        if (error instanceof Error && error.message.includes('rate limit')) {
          console.warn('⚠️ Rate limit hit, clearing remaining queue')
          requestQueue.length = 0 // Clear queue
          break
        }
      }
    }
  }
  
  isProcessingQueue = false
}

function convertTicker(trading212Ticker: string): string {
  // Convert AAPL_US_EQ to AAPL, TSLA_US_EQ to TSLA, etc.
  // Handle special cases for UK/EU stocks that might not work with Alpha Vantage
  const symbol = trading212Ticker.split('_')[0]
  
  // Skip certain symbols that are known to not work with Alpha Vantage
  const skipSymbols = ['FEVRl', 'AAFl', 'JUPl', 'IWGl', 'AIRp', 'BRBYl', 'MONYl', 'ASMLa', 'TSCOl', 'RELl', 'SNl', 'ADMl', 'IHPl', 'SLPLl', 'BAl', 'XIACY', 'DPLMl', 'CKNl', 'HLNl', 'VDPGl']
  
  if (skipSymbols.includes(symbol)) {
    throw new Error(`Skipping ${symbol} - not supported by Alpha Vantage`)
  }
  
  return symbol
}

async function fetchStockOverview(symbol: string): Promise<AlphaVantageOverview | null> {
  return new Promise((resolve, reject) => {
    const request = async () => {
      try {
        // Check cache first
        const cached = fundamentalsCache.get(symbol)
        if (cached && Date.now() < cached.expiresAt) {
          console.log(`💾 Using cached data for ${symbol}`)
          resolve(cached.data)
          return
        }

        // Check daily limits before making request
        if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
          console.warn(`⚠️ Daily request limit reached for ${symbol}`)
          resolve(null)
          return
        }

        console.log(`🔍 Fetching fresh data for ${symbol} (${dailyRequestCount + 1}/${MAX_DAILY_REQUESTS})`)

        const response = await fetch(
          `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${env.ALPHAVANTAGE_API_KEY}`
        )

        if (!response.ok) {
          throw new Error(`Alpha Vantage API error: ${response.status}`)
        }

        const data = await response.json()

        // Check for API errors
        if (data.Note && data.Note.includes('API call frequency')) {
          throw new Error('Alpha Vantage rate limit exceeded')
        }

        if (data.Information && data.Information.includes('Invalid API call')) {
          console.warn(`⚠️ Invalid symbol: ${symbol}`)
          // Cache the null result to avoid retrying
          fundamentalsCache.set(symbol, {
            data: null,
            expiresAt: Date.now() + CACHE_DURATION
          })
          resolve(null)
          return
        }

        // Check if we got valid data
        if (!data.Symbol || Object.keys(data).length < 5) {
          console.warn(`⚠️ No data available for ${symbol}`)
          // Cache the null result
          fundamentalsCache.set(symbol, {
            data: null,
            expiresAt: Date.now() + CACHE_DURATION
          })
          resolve(null)
          return
        }

        // Cache the successful response
        fundamentalsCache.set(symbol, {
          data,
          expiresAt: Date.now() + CACHE_DURATION
        })

        console.log(`✅ Successfully fetched data for ${symbol}`)
        resolve(data)
      } catch (error) {
        console.error(`❌ Error fetching ${symbol}:`, error)
        reject(error)
      }
    }

    requestQueue.push(request)
    processQueue()
  })
}

function enrichPositionWithFundamentals(position: Trading212Position, overview: AlphaVantageOverview | null): EnrichedPosition {
  if (!overview) {
    // Return position with basic fallback data
    return {
      ...position,
      companyName: position.ticker.split('_')[0],
      sector: 'Unknown',
      industry: 'Unknown',
      country: 'Unknown',
      exchange: 'Unknown',
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
  }
}

export async function POST(request: Request) {
  try {
    const { positions }: { positions: Trading212Position[] } = await request.json()

    if (!positions || !Array.isArray(positions)) {
      return NextResponse.json(
        { error: 'Positions array is required' },
        { status: 400 }
      )
    }

    console.log(`🚀 Starting enrichment for ${positions.length} positions`)
    console.log(`📊 Daily request count: ${dailyRequestCount}/${MAX_DAILY_REQUESTS}`)

    const enrichedPositions: EnrichedPosition[] = []
    let processedCount = 0
    let successCount = 0
    let skippedCount = 0

    // Process positions with better error handling
    for (const position of positions) {
      try {
        const symbol = convertTicker(position.ticker)
        console.log(`[${processedCount + 1}/${positions.length}] Processing ${symbol} (from ${position.ticker})`)
        
        const overview = await fetchStockOverview(symbol)
        const enrichedPosition = enrichPositionWithFundamentals(position, overview)
        enrichedPositions.push(enrichedPosition)
        
        if (overview) {
          successCount++
          console.log(`✅ [${processedCount + 1}/${positions.length}] Enriched ${symbol}: ${overview.Name} (${overview.Sector})`)
        } else {
          console.log(`➖ [${processedCount + 1}/${positions.length}] Added ${symbol} without enrichment`)
        }
      } catch (error) {
        skippedCount++
        if (error instanceof Error && error.message.includes('not supported')) {
          console.log(`⏭️ [${processedCount + 1}/${positions.length}] Skipped ${position.ticker}: ${error.message}`)
        } else {
          console.error(`❌ [${processedCount + 1}/${positions.length}] Failed to enrich ${position.ticker}:`, error)
        }
        
        // Add position without enrichment
        const enrichedPosition = enrichPositionWithFundamentals(position, null)
        enrichedPositions.push(enrichedPosition)
      }
      
      processedCount++
      
      // Stop if we hit daily limits
      if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
        console.warn(`⚠️ Daily limit reached. Processing remaining ${positions.length - processedCount} positions without enrichment.`)
        
        // Add remaining positions without enrichment
        for (let i = processedCount; i < positions.length; i++) {
          const remainingPosition = positions[i]
          const enrichedPosition = enrichPositionWithFundamentals(remainingPosition, null)
          enrichedPositions.push(enrichedPosition)
        }
        break
      }
    }

    const summary = {
      totalProcessed: positions.length,
      successfullyEnriched: successCount,
      skipped: skippedCount,
      dailyRequestsUsed: dailyRequestCount,
      maxDailyRequests: MAX_DAILY_REQUESTS,
      rateLimitActive: dailyRequestCount >= MAX_DAILY_REQUESTS
    }

    console.log(`📋 Enrichment Summary:`, summary)

    return NextResponse.json({
      success: true,
      enrichedPositions,
      ...summary
    })

  } catch (error) {
    console.error('Position enrichment error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to enrich positions',
        details: error instanceof Error ? error.message : 'Unknown error',
        dailyRequestsUsed: dailyRequestCount,
        maxDailyRequests: MAX_DAILY_REQUESTS
      },
      { status: 500 }
    )
  }
} 