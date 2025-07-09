import { env } from './env'
import { ApiResponse } from './types'

// Unified company fundamentals interface
export interface CompanyFundamentals {
  ticker: string
  name: string
  description?: string
  sector?: string
  industry?: string
  country?: string
  exchange?: string
  currency?: string
  marketCap?: number
  peRatio?: number
  pegRatio?: number
  eps?: number
  bookValue?: number
  dividendYield?: number
  dividendsPerShare?: number
  beta?: number
  sharesOutstanding?: number
  // Additional metrics
  priceToBook?: number
  enterpriseValue?: number
  revenuePerShare?: number
  operatingMargin?: number
  profitMargin?: number
  returnOnAssets?: number
  returnOnEquity?: number
  debtToEquity?: number
  currentRatio?: number
  quickRatio?: number
  // Price information
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  fiftyDayMovingAverage?: number
  twoHundredDayMovingAverage?: number
  // Analyst data
  analystTargetPrice?: number
  analystRating?: string
  // Metadata
  lastUpdated?: string
  source?: string
  confidence?: number // 0-100, how confident we are in this data
}

// Provider interface that all data providers must implement
export interface FinancialDataProvider {
  name: string
  priority: number // Lower number = higher priority
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  
  // Get fundamentals for a single symbol
  getFundamentals(symbol: string): Promise<CompanyFundamentals | null>
  
  // Get fundamentals for multiple symbols (batch if supported)
  getMultipleFundamentals(symbols: string[]): Promise<Record<string, CompanyFundamentals>>
  
  // Check if the provider is currently available
  isAvailable(): Promise<boolean>
  
  // Get current rate limit status
  getRateLimitStatus(): {
    remaining: number
    resetTime: number
    isLimited: boolean
  }
}

// Rate limiting and caching utilities
class ProviderRateLimiter {
  private callTimes: number[] = []
  private readonly provider: FinancialDataProvider
  
  constructor(provider: FinancialDataProvider) {
    this.provider = provider
  }
  
  canMakeRequest(): boolean {
    const now = Date.now()
    const oneMinute = 60 * 1000
    const oneHour = 60 * 60 * 1000
    const oneDay = 24 * 60 * 60 * 1000
    
    // Clean old calls (remove calls older than one day)
    this.callTimes = this.callTimes.filter(time => now - time < oneDay)
    
    // Check limits
    const callsInLastMinute = this.callTimes.filter(time => now - time < oneMinute).length
    const callsInLastHour = this.callTimes.filter(time => now - time < oneHour).length
    const callsInLastDay = this.callTimes.filter(time => now - time < oneDay).length
    
    return (
      callsInLastMinute < this.provider.rateLimit.requestsPerMinute &&
      callsInLastHour < this.provider.rateLimit.requestsPerHour &&
      callsInLastDay < this.provider.rateLimit.requestsPerDay
    )
  }
  
  recordCall(): void {
    this.callTimes.push(Date.now())
  }
  
  getStatus() {
    const now = Date.now()
    const oneMinute = 60 * 1000
    const oneHour = 60 * 60 * 1000
    const oneDay = 24 * 60 * 60 * 1000
    
    const callsInLastMinute = this.callTimes.filter(time => now - time < oneMinute).length
    const callsInLastHour = this.callTimes.filter(time => now - time < oneHour).length
    const callsInLastDay = this.callTimes.filter(time => now - time < oneDay).length
    
    return {
      remainingMinute: Math.max(0, this.provider.rateLimit.requestsPerMinute - callsInLastMinute),
      remainingHour: Math.max(0, this.provider.rateLimit.requestsPerHour - callsInLastHour),
      remainingDay: Math.max(0, this.provider.rateLimit.requestsPerDay - callsInLastDay),
      isLimited: !this.canMakeRequest()
    }
  }
}

// Global cache for fundamentals data
class FundamentalsCache {
  private cache = new Map<string, { data: CompanyFundamentals; timestamp: number }>()
  private readonly cacheTimeout = 24 * 60 * 60 * 1000 // 24 hours
  
  get(symbol: string): CompanyFundamentals | null {
    const cached = this.cache.get(symbol.toUpperCase())
    if (!cached) return null
    
    const now = Date.now()
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(symbol.toUpperCase())
      return null
    }
    
    return cached.data
  }
  
  set(symbol: string, data: CompanyFundamentals): void {
    this.cache.set(symbol.toUpperCase(), {
      data: { ...data, lastUpdated: new Date().toISOString() },
      timestamp: Date.now()
    })
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Alpha Vantage Provider Implementation
class AlphaVantageProvider implements FinancialDataProvider {
  name = 'Alpha Vantage'
  priority = 1
  rateLimit = {
    requestsPerMinute: 5,
    requestsPerHour: 300,
    requestsPerDay: 500
  }
  
  private rateLimiter = new ProviderRateLimiter(this)
  
  async getFundamentals(symbol: string): Promise<CompanyFundamentals | null> {
    if (!this.rateLimiter.canMakeRequest()) {
      throw new Error('Rate limit exceeded')
    }
    
    try {
      this.rateLimiter.recordCall()
      
      const response = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${env.ALPHAVANTAGE_API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data['Error Message'] || data['Note']) {
        throw new Error(data['Error Message'] || data['Note'])
      }
      
      return this.normalizeAlphaVantageData(data)
    } catch (error) {
      console.error(`Alpha Vantage error for ${symbol}:`, error)
      return null
    }
  }
  
  async getMultipleFundamentals(symbols: string[]): Promise<Record<string, CompanyFundamentals>> {
    const results: Record<string, CompanyFundamentals> = {}
    
    // Alpha Vantage doesn't support batch requests, so we do them sequentially
    for (const symbol of symbols) {
      const fundamental = await this.getFundamentals(symbol)
      if (fundamental) {
        results[symbol] = fundamental
      }
    }
    
    return results
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=IBM&apikey=${env.ALPHAVANTAGE_API_KEY}`)
      return response.ok
    } catch {
      return false
    }
  }
  
  getRateLimitStatus() {
    const status = this.rateLimiter.getStatus()
    return {
      remaining: status.remainingMinute,
      resetTime: Date.now() + 60 * 1000, // Next minute
      isLimited: status.isLimited
    }
  }
  
  private normalizeAlphaVantageData(data: Record<string, unknown>): CompanyFundamentals {
    const parseFloat = (value: string | undefined): number | undefined => {
      if (!value || value === 'None' || value === '-') return undefined
      const num = Number(value)
      return isNaN(num) ? undefined : num
    }
    
    const getString = (value: unknown): string => {
      return typeof value === 'string' ? value : ''
    }
    
    const getStringOrUndefined = (value: unknown): string | undefined => {
      return typeof value === 'string' ? value : undefined
    }
    
    return {
      ticker: getString(data.Symbol),
      name: getString(data.Name),
      description: getStringOrUndefined(data.Description),
      sector: getStringOrUndefined(data.Sector),
      industry: getStringOrUndefined(data.Industry),
      country: getStringOrUndefined(data.Country),
      exchange: getStringOrUndefined(data.Exchange),
      currency: getStringOrUndefined(data.Currency),
      marketCap: parseFloat(getStringOrUndefined(data.MarketCapitalization)),
      peRatio: parseFloat(getStringOrUndefined(data.PERatio)),
      pegRatio: parseFloat(getStringOrUndefined(data.PEGRatio)),
      eps: parseFloat(getStringOrUndefined(data.EPS)),
      bookValue: parseFloat(getStringOrUndefined(data.BookValue)),
      dividendYield: parseFloat(getStringOrUndefined(data.DividendYield)),
      dividendsPerShare: parseFloat(getStringOrUndefined(data.DividendPerShare)),
      beta: parseFloat(getStringOrUndefined(data.Beta)),
      sharesOutstanding: parseFloat(getStringOrUndefined(data.SharesOutstanding)),
      priceToBook: parseFloat(getStringOrUndefined(data.PriceToBookRatio)),
      enterpriseValue: parseFloat(getStringOrUndefined(data.MarketCapitalization)), // Approximation
      revenuePerShare: parseFloat(getStringOrUndefined(data.RevenuePerShareTTM)),
      operatingMargin: parseFloat(getStringOrUndefined(data.OperatingMarginTTM)),
      profitMargin: parseFloat(getStringOrUndefined(data.ProfitMargin)),
      returnOnAssets: parseFloat(getStringOrUndefined(data.ReturnOnAssetsTTM)),
      returnOnEquity: parseFloat(getStringOrUndefined(data.ReturnOnEquityTTM)),
      fiftyTwoWeekHigh: parseFloat(getStringOrUndefined(data['52WeekHigh'])),
      fiftyTwoWeekLow: parseFloat(getStringOrUndefined(data['52WeekLow'])),
      fiftyDayMovingAverage: parseFloat(getStringOrUndefined(data['50DayMovingAverage'])),
      twoHundredDayMovingAverage: parseFloat(getStringOrUndefined(data['200DayMovingAverage'])),
      analystTargetPrice: parseFloat(getStringOrUndefined(data.AnalystTargetPrice)),
      source: 'Alpha Vantage',
      confidence: 90 // High confidence in Alpha Vantage data
    }
  }
}

// Tiingo Provider Implementation
class TiingoProvider implements FinancialDataProvider {
  name = 'Tiingo'
  priority = 2
  rateLimit = {
    requestsPerMinute: 45,
    requestsPerHour: 45,
    requestsPerDay: 1000
  }
  
  private rateLimiter = new ProviderRateLimiter(this)
  
  async getFundamentals(symbol: string): Promise<CompanyFundamentals | null> {
    if (!this.rateLimiter.canMakeRequest()) {
      throw new Error('Rate limit exceeded')
    }
    
    try {
      this.rateLimiter.recordCall()
      
      // Get metadata and fundamentals in parallel
      const [metaResponse, fundamentalsResponse] = await Promise.all([
        fetch(`https://api.tiingo.com/tiingo/fundamentals/${symbol}/meta?token=${env.TIINGO_API_KEY}`),
        fetch(`https://api.tiingo.com/tiingo/fundamentals/${symbol}/daily?token=${env.TIINGO_API_KEY}`)
      ])
      
      if (!metaResponse.ok || !fundamentalsResponse.ok) {
        throw new Error(`Tiingo API error: ${metaResponse.status} / ${fundamentalsResponse.status}`)
      }
      
      const metaData = await metaResponse.json()
      const fundamentalsData = await fundamentalsResponse.json()
      
      return this.normalizeTiingoData(metaData, fundamentalsData)
    } catch (error) {
      console.error(`Tiingo error for ${symbol}:`, error)
      return null
    }
  }
  
  async getMultipleFundamentals(symbols: string[]): Promise<Record<string, CompanyFundamentals>> {
    const results: Record<string, CompanyFundamentals> = {}
    
    // Tiingo doesn't support batch requests either
    for (const symbol of symbols) {
      const fundamental = await this.getFundamentals(symbol)
      if (fundamental) {
        results[symbol] = fundamental
      }
    }
    
    return results
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`https://api.tiingo.com/tiingo/fundamentals/AAPL/meta?token=${env.TIINGO_API_KEY}`)
      return response.ok
    } catch {
      return false
    }
  }
  
  getRateLimitStatus() {
    const status = this.rateLimiter.getStatus()
    return {
      remaining: status.remainingHour,
      resetTime: Date.now() + 60 * 60 * 1000, // Next hour
      isLimited: status.isLimited
    }
  }
  
  private normalizeTiingoData(metaData: Record<string, unknown>, fundamentalsData: Record<string, unknown>[]): CompanyFundamentals {
    // Get latest fundamentals (array format)
    const latestFundamentals = Array.isArray(fundamentalsData) ? fundamentalsData[0] : fundamentalsData
    
    return {
      ticker: String(metaData.ticker || ''),
      name: String(metaData.name || ''),
      description: metaData.description ? String(metaData.description) : undefined,
      sector: metaData.sector ? String(metaData.sector) : undefined,
      industry: metaData.industry ? String(metaData.industry) : undefined,
      country: metaData.country ? String(metaData.country) : undefined,
      exchange: metaData.exchange ? String(metaData.exchange) : undefined,
      currency: metaData.currency ? String(metaData.currency) : undefined,
      marketCap: typeof latestFundamentals?.marketCap === 'number' ? latestFundamentals.marketCap : undefined,
      peRatio: typeof latestFundamentals?.peRatio === 'number' ? latestFundamentals.peRatio : undefined,
      pegRatio: typeof latestFundamentals?.trailingPEG1Y === 'number' ? latestFundamentals.trailingPEG1Y : undefined,
      eps: typeof latestFundamentals?.eps === 'number' ? latestFundamentals.eps : undefined,
      bookValue: typeof latestFundamentals?.bookValue === 'number' ? latestFundamentals.bookValue : undefined,
      dividendYield: typeof latestFundamentals?.dividendYield === 'number' ? latestFundamentals.dividendYield : undefined,
      dividendsPerShare: typeof latestFundamentals?.dividendsPerShare === 'number' ? latestFundamentals.dividendsPerShare : undefined,
      beta: typeof latestFundamentals?.beta === 'number' ? latestFundamentals.beta : undefined,
      sharesOutstanding: typeof latestFundamentals?.sharesOutstanding === 'number' ? latestFundamentals.sharesOutstanding : undefined,
      priceToBook: typeof latestFundamentals?.pbRatio === 'number' ? latestFundamentals.pbRatio : undefined,
      enterpriseValue: typeof latestFundamentals?.enterpriseVal === 'number' ? latestFundamentals.enterpriseVal : undefined,
      source: 'Tiingo',
      confidence: 80 // Good confidence in Tiingo data
    }
  }
}

// Polygon Provider Implementation (placeholder for future)
class PolygonProvider implements FinancialDataProvider {
  name = 'Polygon'
  priority = 3
  rateLimit = {
    requestsPerMinute: 60,
    requestsPerHour: 3600,
    requestsPerDay: 50000
  }
  
  async getFundamentals(symbol: string): Promise<CompanyFundamentals | null> {
    // TODO: Implement Polygon API integration
    // This is a placeholder for future implementation
    console.log(`Polygon provider not yet implemented for ${symbol}`)
    return null
  }
  
  async getMultipleFundamentals(): Promise<Record<string, CompanyFundamentals>> {
    // TODO: Implement Polygon batch requests
    return {}
  }
  
  async isAvailable(): Promise<boolean> {
    // TODO: Implement Polygon availability check
    return false
  }
  
  getRateLimitStatus() {
    return {
      remaining: 0,
      resetTime: Date.now() + 60 * 1000,
      isLimited: true
    }
  }
}

// Main Financial Data Service with fallback logic
export class FinancialDataService {
  private providers: FinancialDataProvider[] = []
  private cache = new FundamentalsCache()
  
  constructor() {
    // Register providers in priority order
    this.providers = [
      new AlphaVantageProvider(),
      new TiingoProvider(),
      new PolygonProvider()
    ].sort((a, b) => a.priority - b.priority)
  }
  
  /**
   * Get fundamentals for a single symbol with fallback logic
   */
  async getFundamentals(symbol: string): Promise<ApiResponse<CompanyFundamentals>> {
    // Check cache first
    const cached = this.cache.get(symbol)
    if (cached) {
      return {
        success: true,
        data: cached,
        timestamp: new Date().toISOString()
      }
    }
    
    // Try each provider in order
    for (const provider of this.providers) {
      try {
        console.log(`Trying ${provider.name} for ${symbol}`)
        
        const result = await provider.getFundamentals(symbol)
        if (result) {
          // Cache the result
          this.cache.set(symbol, result)
          
          return {
            success: true,
            data: result,
            timestamp: new Date().toISOString()
          }
        }
      } catch (error) {
        console.warn(`${provider.name} failed for ${symbol}:`, error)
        continue
      }
    }
    
    // All providers failed
    return {
      success: false,
      data: null,
      error: 'All financial data providers failed or are rate limited',
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * Get fundamentals for multiple symbols with intelligent batching
   */
  async getMultipleFundamentals(symbols: string[]): Promise<ApiResponse<Record<string, CompanyFundamentals>>> {
    const results: Record<string, CompanyFundamentals> = {}
    const uncachedSymbols: string[] = []
    
    // Check cache for each symbol
    for (const symbol of symbols) {
      const cached = this.cache.get(symbol)
      if (cached) {
        results[symbol] = cached
      } else {
        uncachedSymbols.push(symbol)
      }
    }
    
    // Try providers for uncached symbols
    for (const provider of this.providers) {
      if (uncachedSymbols.length === 0) break
      
      try {
        console.log(`Trying ${provider.name} for ${uncachedSymbols.length} symbols`)
        
        const providerResults = await provider.getMultipleFundamentals(uncachedSymbols)
        
        // Cache and collect results
        for (const [symbol, data] of Object.entries(providerResults)) {
          this.cache.set(symbol, data)
          results[symbol] = data
          
          // Remove from uncached list
          const index = uncachedSymbols.indexOf(symbol)
          if (index > -1) {
            uncachedSymbols.splice(index, 1)
          }
        }
      } catch (error) {
        console.warn(`${provider.name} batch failed:`, error)
        continue
      }
    }
    
    return {
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * Get status of all providers
   */
  getProviderStatus() {
    return this.providers.map(provider => ({
      name: provider.name,
      priority: provider.priority,
      rateLimit: provider.getRateLimitStatus(),
      available: true // Would need to check availability
    }))
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }
}

// Export singleton instance
export const financialDataService = new FinancialDataService() 