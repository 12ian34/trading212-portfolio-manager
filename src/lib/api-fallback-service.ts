/**
 * API Fallback Service - Handles graceful degradation when API limits are exceeded
 * 
 * Features:
 * - Automatic provider switching (Alpha Vantage → Tiingo → Cache)
 * - Cached data fallbacks with staleness indicators
 * - Retry mechanisms with exponential backoff
 * - User-friendly error messages and degradation indicators
 */

import { getAllApiStatus, type ApiLimitsSummary } from '@/lib/api-limits-service'
import { alphaVantageCache } from '@/lib/alphavantage-cache'
import { tiingoCache } from '@/lib/tiingo-cache'

export type FallbackProvider = 'alphavantage' | 'tiingo' | 'cache' | 'demo'
export type FallbackReason = 'rate_limited' | 'api_error' | 'network_error' | 'quota_exceeded'

export interface FallbackResult<T> {
  data: T
  provider: FallbackProvider
  reason?: FallbackReason
  isStale?: boolean
  staleAge?: number // milliseconds
  retryAfter?: number // seconds
  degradedFeatures?: string[]
  userMessage?: string
  fallbackApplied?: boolean
}

export interface FallbackOptions {
  enableProviderSwitching?: boolean
  enableCacheFallback?: boolean
  maxRetries?: number
  retryDelay?: number
  preferredProvider?: FallbackProvider
  allowDemoData?: boolean
}

export interface SectorAnalysisResult {
  provider: string
  symbols: string[]
  sectors: Array<{
    name: string
    allocation: number
    performance: number
  }>
  isStale?: boolean
}

export class ApiFallbackService {
  private static instance: ApiFallbackService
  private apiStatus: ApiLimitsSummary | null = null
  private lastStatusUpdate: number = 0
  private readonly STATUS_CACHE_TTL = 30000 // 30 seconds

  static getInstance(): ApiFallbackService {
    if (!ApiFallbackService.instance) {
      ApiFallbackService.instance = new ApiFallbackService()
    }
    return ApiFallbackService.instance
  }

  private constructor() {}

  /**
   * Get current API status with caching
   */
  private async getApiStatus(): Promise<ApiLimitsSummary | null> {
    const now = Date.now()
    
    if (this.apiStatus && (now - this.lastStatusUpdate) < this.STATUS_CACHE_TTL) {
      return this.apiStatus
    }

    try {
      this.apiStatus = await getAllApiStatus()
      this.lastStatusUpdate = now
      return this.apiStatus
    } catch (error) {
      console.error('Failed to get API status for fallback:', error)
      return null
    }
  }

  /**
   * Check if a provider can handle the requested number of calls
   */
  private async canProviderHandle(provider: string, estimatedCalls: number): Promise<boolean> {
    const status = await this.getApiStatus()
    if (!status) return false

    const providerStatus = status.providers.find(p => 
      p.provider.toLowerCase().replace(' ', '') === provider.toLowerCase()
    )

    if (!providerStatus || !providerStatus.canMakeRequest) {
      return false
    }

    // Check most restrictive limit
    const limits = [
      providerStatus.remainingMinute,
      providerStatus.remainingHour,
      providerStatus.remainingDay
    ].filter(limit => limit !== null) as number[]

    const minRemaining = Math.min(...limits, Infinity)
    return minRemaining >= estimatedCalls
  }

  /**
   * Get the best available provider for the requested operation
   */
  private async getBestProvider(
    estimatedCalls: number,
    preferredProvider?: FallbackProvider
  ): Promise<{provider: FallbackProvider; reason?: FallbackReason; fallbackApplied: boolean}> {
    
    // Try preferred provider first
    if (preferredProvider && preferredProvider !== 'cache' && preferredProvider !== 'demo') {
      if (await this.canProviderHandle(preferredProvider, estimatedCalls)) {
        return { provider: preferredProvider, fallbackApplied: false }
      }
    }

    // Try providers in order of preference
    const providers: FallbackProvider[] = ['alphavantage', 'tiingo']
    
    for (const provider of providers) {
      if (await this.canProviderHandle(provider, estimatedCalls)) {
        const fallbackApplied = preferredProvider ? provider !== preferredProvider : false
        return { provider, fallbackApplied }
      }
    }

    // All providers are limited
    return { provider: 'cache', reason: 'rate_limited', fallbackApplied: true }
  }

  /**
   * Execute API call with fallback logic
   */
  async executeWithFallback<T>(
    operation: string,
    estimatedCalls: number,
    primaryExecutor: () => Promise<T>,
    cacheExecutor?: () => Promise<T>,
    options: FallbackOptions = {}
  ): Promise<FallbackResult<T>> {
    const {
      enableCacheFallback = true,
      maxRetries = 3,
      retryDelay = 1000,
      preferredProvider = 'alphavantage',
      allowDemoData = false
    } = options

    let attempts = 0

    while (attempts < maxRetries) {
      try {
        const { provider, reason, fallbackApplied } = await this.getBestProvider(estimatedCalls, preferredProvider)

        // Try primary API providers
        if (provider === 'alphavantage' || provider === 'tiingo') {
          try {
            const data = await primaryExecutor()
            return {
              data,
              provider,
              fallbackApplied,
              userMessage: fallbackApplied 
                ? `Successfully completed ${operation} using ${provider} (fallback applied)`
                : `Successfully completed ${operation} using ${provider}`
            }
          } catch (error) {
            console.error('%s failed for %s:', provider, operation, error)
            // Continue to cache fallback
          }
        }

        // Fallback to cache
        if ((provider === 'cache' || provider === 'alphavantage' || provider === 'tiingo') && enableCacheFallback && cacheExecutor) {
          try {
            const data = await cacheExecutor()
            return {
              data,
              provider: 'cache',
              reason: reason || 'api_error',
              isStale: true,
              staleAge: 3600000, // 1 hour default
              degradedFeatures: ['real-time-data'],
              fallbackApplied: true,
              userMessage: `Using cached data for ${operation} - APIs are limited or unavailable`
            }
          } catch (error) {
            console.error('Cache fallback failed for %s:', operation, error)
          }
        }

        // Final fallback to demo data
        if (allowDemoData) {
          // Return demo data would go here
          throw new Error('Demo data not implemented')
        }

        throw new Error(`All fallback options exhausted for ${operation}`)

      } catch (error) {
        attempts++
        
        if (attempts >= maxRetries) {
          throw error
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts - 1)))
      }
    }

    throw new Error(`Failed to execute ${operation} after all retries`)
  }

  /**
   * Get data from cache with staleness check
   */
  async getCachedData(ticker: string): Promise<{data: unknown; isStale: boolean; age: number} | null> {
    try {
      // Try Alpha Vantage cache first
      const alphaData = await alphaVantageCache.get(ticker)
      if (alphaData) {
        // Assume cache is 1 hour old for simplicity
        const age = 3600000
        const isStale = true
        
        return {
          data: { ...alphaData, dataSource: 'alphavantage-cache' },
          isStale,
          age
        }
      }
      
      // Fallback to Tiingo cache
      const tiingoData = await tiingoCache.get(ticker)
      if (tiingoData) {
        // Assume cache is 1 hour old for simplicity
        const age = 3600000
        const isStale = true
        
        return {
          data: { ...tiingoData, dataSource: 'tiingo-cache' },
          isStale,
          age
        }
      }
    } catch (error) {
      console.error('Error getting cached data:', error)
    }

    return null
  }

  /**
   * Get sector analysis with fallback
   */
  async getSectorAnalysis(
    symbols: string[],
    options: FallbackOptions = {}
  ): Promise<FallbackResult<SectorAnalysisResult>> {
    return this.executeWithFallback(
      'sector analysis',
      symbols.length,
      async () => {
        // Primary implementation would go here
        return {
          provider: 'alphavantage',
          symbols,
          sectors: []
        }
      },
      async () => {
        // Cache implementation would go here
        return {
          provider: 'cache',
          symbols,
          sectors: [],
          isStale: true
        }
      },
      options
    )
  }

  /**
   * Get estimated time until API limits reset
   */
  async getRetryEstimate(provider: FallbackProvider): Promise<number | null> {
    const status = await this.getApiStatus()
    if (!status) return null

    const providerStatus = status.providers.find(p => 
      p.provider.toLowerCase().replace(' ', '') === provider.toLowerCase()
    )

    if (!providerStatus) return null

    // Simple estimation - return time until minute limit resets
    if (providerStatus.remainingMinute === 0) {
      return 60 // 1 minute
    }

    return null
  }

  /**
   * Check if fallback is currently active for any provider
   */
  async isFallbackActive(): Promise<{active: boolean; reasons: string[]}> {
    const status = await this.getApiStatus()
    if (!status) return { active: true, reasons: ['API status unavailable'] }

    const reasons: string[] = []
    let active = false

    for (const provider of status.providers) {
      if (!provider.canMakeRequest) {
        active = true
        reasons.push(`${provider.provider} is rate limited`)
      }
    }

    return { active, reasons }
  }

  /**
   * Clear all caches (for testing/debugging)
   */
  async clearAllCaches(): Promise<void> {
    await alphaVantageCache.clear()
    await tiingoCache.clear()
    this.apiStatus = null
    this.lastStatusUpdate = 0
  }
}

// Export singleton instance
export const apiFallbackService = ApiFallbackService.getInstance()

// Utility functions for common operations
export async function executeWithFallback<T>(
  operation: string,
  estimatedCalls: number,
  primaryExecutor: () => Promise<T>,
  cacheExecutor?: () => Promise<T>,
  options?: FallbackOptions
): Promise<FallbackResult<T>> {
  return apiFallbackService.executeWithFallback(operation, estimatedCalls, primaryExecutor, cacheExecutor, options)
}

export async function getSectorAnalysisWithFallback(
  symbols: string[],
  options?: FallbackOptions
): Promise<FallbackResult<SectorAnalysisResult>> {
  return apiFallbackService.getSectorAnalysis(symbols, options)
} 