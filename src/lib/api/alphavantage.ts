import axios, { AxiosInstance, AxiosError } from 'axios'
import { env } from '@/lib/env'
import { 
  AlphaVantageOverview, 
  AlphaVantageOverviewSchema,
  ApiResponse 
} from '@/lib/types'

// Rate limiting queue for Alpha Vantage API
class RateLimitQueue {
  private queue: Array<() => Promise<unknown>> = []
  private processing = false
  private lastCallTime = 0
  private readonly minInterval = 12000 // 12 seconds between calls (5 calls per minute)

  async add<T>(apiCall: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await apiCall()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastCall = now - this.lastCallTime
      
      if (timeSinceLastCall < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastCall
        console.log(`[AlphaVantage] Rate limiting: waiting ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
      
      const apiCall = this.queue.shift()
      if (apiCall) {
        this.lastCallTime = Date.now()
        await apiCall()
      }
    }
    
    this.processing = false
  }

  getQueueSize(): number {
    return this.queue.length
  }
}

class AlphaVantageApiClient {
  private client: AxiosInstance
  private rateLimitQueue: RateLimitQueue
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private readonly cacheTimeout = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    this.client = axios.create({
      baseURL: 'https://www.alphavantage.co/query',
      timeout: 30000,
    })
    
    this.rateLimitQueue = new RateLimitQueue()

    // Add request/response interceptors
    this.client.interceptors.request.use(
      (config) => {
        config.params = {
          ...config.params,
          apikey: env.ALPHAVANTAGE_API_KEY,
        }
        console.log(`[AlphaVantage] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('[AlphaVantage] Request error:', error)
        return Promise.reject(error)
      }
    )

    this.client.interceptors.response.use(
      (response) => {
        console.log(`[AlphaVantage] ${response.status} ${response.config.url}`)
        return response
      },
      (error: AxiosError) => {
        console.error('[AlphaVantage] Response error:', error.response?.status, error.message)
        return Promise.reject(error)
      }
    )
  }

  private handleError<T>(error: AxiosError): ApiResponse<T> {
    const timestamp = new Date().toISOString()
    
    if (error.response?.status === 429) {
      return {
        success: false,
        data: null,
        error: 'Alpha Vantage API rate limit exceeded. Please try again later.',
        timestamp,
      }
    }

    if (error.response?.status === 403) {
      return {
        success: false,
        data: null,
        error: 'Invalid Alpha Vantage API key. Please check your configuration.',
        timestamp,
      }
    }

    if (error.response?.status === 503) {
      return {
        success: false,
        data: null,
        error: 'Alpha Vantage API is temporarily unavailable. Please try again later.',
        timestamp,
      }
    }

    return {
      success: false,
      data: null,
      error: error.message || 'An error occurred while connecting to Alpha Vantage API.',
      timestamp,
    }
  }

  private getCacheKey(symbol: string, function_name: string): string {
    return `${function_name}:${symbol}`
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    const now = Date.now()
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data as T
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Get company overview/fundamentals
   */
  async getOverview(symbol: string): Promise<ApiResponse<AlphaVantageOverview>> {
    const cacheKey = this.getCacheKey(symbol, 'OVERVIEW')
    
    // Check cache first
    const cachedData = this.getFromCache<AlphaVantageOverview>(cacheKey)
    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const response = await this.rateLimitQueue.add(() =>
        this.client.get('', {
          params: {
            function: 'OVERVIEW',
            symbol: symbol,
          },
        })
      )

      // Check for API error messages
      if (response.data?.['Error Message']) {
        return {
          success: false,
          data: null,
          error: `Alpha Vantage API Error: ${response.data['Error Message']}`,
          timestamp: new Date().toISOString(),
        }
      }

      if (response.data?.['Note']) {
        return {
          success: false,
          data: null,
          error: `Alpha Vantage API Note: ${response.data['Note']}`,
          timestamp: new Date().toISOString(),
        }
      }

      const validatedData = AlphaVantageOverviewSchema.parse(response.data)
      
      // Cache the result
      this.setCache(cacheKey, validatedData)
      
      return {
        success: true,
        data: validatedData,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        return this.handleError(error)
      }
      return {
        success: false,
        data: null,
        error: `Failed to validate overview data for ${symbol}.`,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Get fundamentals for multiple symbols
   */
  async getMultipleOverviews(symbols: string[]): Promise<ApiResponse<Record<string, AlphaVantageOverview>>> {
    try {
      const results: Record<string, AlphaVantageOverview> = {}
      const errors: string[] = []

      // Process symbols in batches to respect rate limits
      for (const symbol of symbols) {
        const response = await this.getOverview(symbol)
        
        if (response.success && response.data) {
          results[symbol] = response.data
        } else {
          errors.push(`${symbol}: ${response.error || 'Unknown error'}`)
        }
      }

      if (Object.keys(results).length === 0) {
        return {
          success: false,
          data: null,
          error: `Failed to get data for any symbols. Errors: ${errors.join(', ')}`,
          timestamp: new Date().toISOString(),
        }
      }

      return {
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
      }
    } catch {
      return {
        success: false,
        data: null,
        error: 'Failed to get multiple overviews.',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      // Test with a well-known symbol
      const response = await this.client.get('', {
        params: {
          function: 'OVERVIEW',
          symbol: 'AAPL',
        },
      })
      
      const hasValidData = response.data && !response.data['Error Message'] && !response.data['Note']
      
      return {
        success: hasValidData,
        data: hasValidData,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        return this.handleError(error) as ApiResponse<boolean>
      }
      return {
        success: false,
        data: false,
        error: 'Failed to test Alpha Vantage connection.',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): { size: number } {
    return {
      size: this.rateLimitQueue.getQueueSize(),
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const alphaVantageClient = new AlphaVantageApiClient()
export type { AlphaVantageOverview } 