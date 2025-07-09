/**
 * Unified API Limits Tracking Service
 * 
 * Provides centralized tracking and management of API usage across all providers:
 * - Alpha Vantage: 25/day, 5/minute
 * - Tiingo: 50/hour, 1000/day  
 * - Trading212: Basic rate limiting
 */

export interface ApiLimits {
  requestsPerMinute?: number
  requestsPerHour?: number
  requestsPerDay?: number
}

export interface ApiUsage {
  requestsThisMinute: number
  requestsThisHour: number
  requestsThisDay: number
  lastRequestTime?: number
  totalRequestsAllTime: number
}

export interface ApiProvider {
  name: string
  limits: ApiLimits
  usage: ApiUsage
  isEnabled: boolean
  lastError?: string
  lastErrorTime?: number
}

export interface ApiLimitStatus {
  provider: string
  canMakeRequest: boolean
  remainingMinute: number
  remainingHour: number  
  remainingDay: number
  nextResetTime: {
    minute: number
    hour: number
    day: number
  }
  queueSize?: number
  warning?: string
}

export interface ApiLimitsSummary {
  providers: ApiLimitStatus[]
  totalRemaining: {
    minute: number
    hour: number
    day: number
  }
  criticalLimits: string[]
  recommendations: string[]
}

class ApiLimitsTracker {
  private providers: Map<string, ApiProvider> = new Map()
  private callHistory: Map<string, number[]> = new Map() // provider -> timestamps
  
  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // Alpha Vantage - very restrictive free tier
    this.providers.set('alphavantage', {
      name: 'Alpha Vantage',
      limits: {
        requestsPerMinute: 5,
        requestsPerDay: 25
      },
      usage: {
        requestsThisMinute: 0,
        requestsThisHour: 0,
        requestsThisDay: 0,
        totalRequestsAllTime: 0
      },
      isEnabled: true
    })

    // Tiingo - more generous limits
    this.providers.set('tiingo', {
      name: 'Tiingo',
      limits: {
        requestsPerHour: 50,
        requestsPerDay: 1000
      },
      usage: {
        requestsThisMinute: 0,
        requestsThisHour: 0,
        requestsThisDay: 0,
        totalRequestsAllTime: 0
      },
      isEnabled: true
    })

    // Trading212 - no explicit limits, basic tracking
    this.providers.set('trading212', {
      name: 'Trading212',
      limits: {
        // No explicit limits documented, track for visibility
      },
      usage: {
        requestsThisMinute: 0,
        requestsThisHour: 0,
        requestsThisDay: 0,
        totalRequestsAllTime: 0
      },
      isEnabled: true
    })

    // Initialize call history for each provider
    for (const providerName of this.providers.keys()) {
      this.callHistory.set(providerName, [])
    }
  }

  /**
   * Record an API call for a provider
   */
  recordCall(providerName: string, isSuccess: boolean = true, error?: string): void {
    const provider = this.providers.get(providerName)
    if (!provider) {
      console.warn(`Unknown API provider: ${providerName}`)
      return
    }

    const now = Date.now()
    const history = this.callHistory.get(providerName) || []
    
    // Add current call
    history.push(now)
    
    // Clean up old calls (keep last 24 hours)
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    const recentCalls = history.filter(timestamp => timestamp > oneDayAgo)
    this.callHistory.set(providerName, recentCalls)

    // Update usage counters
    provider.usage = this.calculateUsage(providerName, now)
    provider.usage.lastRequestTime = now
    provider.usage.totalRequestsAllTime++

    // Record error if failed
    if (!isSuccess && error) {
      provider.lastError = error
      provider.lastErrorTime = now
    } else if (isSuccess) {
      // Clear error on success
      provider.lastError = undefined
      provider.lastErrorTime = undefined
    }

    console.log(`📊 [${provider.name}] API call recorded: ${this.formatUsageString(providerName)}`)
  }

  /**
   * Check if a provider can make a request
   */
  canMakeRequest(providerName: string): boolean {
    const status = this.getProviderStatus(providerName)
    return status?.canMakeRequest ?? false
  }

  /**
   * Get detailed status for a specific provider
   */
  getProviderStatus(providerName: string): ApiLimitStatus | null {
    const provider = this.providers.get(providerName)
    if (!provider) return null

    const now = Date.now()
    const usage = this.calculateUsage(providerName, now)
    const limits = provider.limits

    const remainingMinute = (limits.requestsPerMinute ?? Infinity) - usage.requestsThisMinute
    const remainingHour = (limits.requestsPerHour ?? Infinity) - usage.requestsThisHour  
    const remainingDay = (limits.requestsPerDay ?? Infinity) - usage.requestsThisDay

    const canMakeRequest = remainingMinute > 0 && remainingHour > 0 && remainingDay > 0

    // Calculate next reset times
    const nextMinute = Math.ceil(now / (60 * 1000)) * (60 * 1000)
    const nextHour = Math.ceil(now / (60 * 60 * 1000)) * (60 * 60 * 1000)
    const nextDay = new Date(now)
    nextDay.setHours(24, 0, 0, 0)

    // Generate warnings
    let warning: string | undefined
    if (remainingDay <= 5 && limits.requestsPerDay) {
      warning = `Only ${remainingDay} requests remaining today`
    } else if (remainingHour <= 5 && limits.requestsPerHour) {
      warning = `Only ${remainingHour} requests remaining this hour`
    } else if (remainingMinute <= 1 && limits.requestsPerMinute) {
      warning = `Only ${remainingMinute} requests remaining this minute`
    }

    return {
      provider: provider.name,
      canMakeRequest,
      remainingMinute: Math.max(0, remainingMinute),
      remainingHour: Math.max(0, remainingHour),
      remainingDay: Math.max(0, remainingDay),
      nextResetTime: {
        minute: nextMinute,
        hour: nextHour,
        day: nextDay.getTime()
      },
      warning
    }
  }

  /**
   * Get status for all providers
   */
  getAllProvidersStatus(): ApiLimitsSummary {
    const providers: ApiLimitStatus[] = []
    const criticalLimits: string[] = []
    const recommendations: string[] = []

    let totalRemainingMinute = 0
    let totalRemainingHour = 0
    let totalRemainingDay = 0

    for (const providerName of this.providers.keys()) {
      const status = this.getProviderStatus(providerName)
      if (status) {
        providers.push(status)
        
        totalRemainingMinute += status.remainingMinute
        totalRemainingHour += status.remainingHour
        totalRemainingDay += status.remainingDay

        // Check for critical limits
        if (!status.canMakeRequest) {
          criticalLimits.push(`${status.provider} has reached its limits`)
        } else if (status.warning) {
          criticalLimits.push(`${status.provider}: ${status.warning}`)
        }
      }
    }

    // Generate recommendations
    if (criticalLimits.length > 0) {
      recommendations.push('Consider using cached data or reducing API calls')
    }
    
    const alphaStatus = this.getProviderStatus('alphavantage')
    if (alphaStatus && alphaStatus.remainingDay <= 10) {
      recommendations.push('Alpha Vantage limit is low - rely more on Tiingo')
    }

    return {
      providers,
      totalRemaining: {
        minute: totalRemainingMinute,
        hour: totalRemainingHour,
        day: totalRemainingDay
      },
      criticalLimits,
      recommendations
    }
  }

  /**
   * Calculate current usage for a provider
   */
  private calculateUsage(providerName: string, now: number): ApiUsage {
    const history = this.callHistory.get(providerName) || []
    
    const oneMinuteAgo = now - (60 * 1000)
    const oneHourAgo = now - (60 * 60 * 1000)  
    const oneDayAgo = now - (24 * 60 * 60 * 1000)

    return {
      requestsThisMinute: history.filter(t => t > oneMinuteAgo).length,
      requestsThisHour: history.filter(t => t > oneHourAgo).length,
      requestsThisDay: history.filter(t => t > oneDayAgo).length,
      totalRequestsAllTime: history.length
    }
  }

  /**
   * Get usage string for logging
   */
  private formatUsageString(providerName: string): string {
    const status = this.getProviderStatus(providerName)
    if (!status) return 'Unknown'

    const provider = this.providers.get(providerName)
    const limits = provider?.limits

    const parts: string[] = []
    
    if (limits?.requestsPerMinute) {
      const used = (limits.requestsPerMinute - status.remainingMinute)
      parts.push(`${used}/${limits.requestsPerMinute}/min`)
    }
    
    if (limits?.requestsPerHour) {
      const used = (limits.requestsPerHour - status.remainingHour)
      parts.push(`${used}/${limits.requestsPerHour}/hour`)
    }
    
    if (limits?.requestsPerDay) {
      const used = (limits.requestsPerDay - status.remainingDay)
      parts.push(`${used}/${limits.requestsPerDay}/day`)
    }

    return parts.join(', ')
  }

  /**
   * Reset usage for testing purposes
   */
  resetUsage(providerName?: string): void {
    if (providerName) {
      this.callHistory.set(providerName, [])
      const provider = this.providers.get(providerName)
      if (provider) {
        provider.usage = {
          requestsThisMinute: 0,
          requestsThisHour: 0,
          requestsThisDay: 0,
          totalRequestsAllTime: 0
        }
      }
    } else {
      // Reset all providers
      for (const providerName of this.providers.keys()) {
        this.resetUsage(providerName)
      }
    }
  }

  /**
   * Get provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Check if any provider has critical limits
   */
  hasCriticalLimits(): boolean {
    const summary = this.getAllProvidersStatus()
    return summary.criticalLimits.length > 0
  }

  /**
   * Get the best provider to use for a request (highest remaining capacity)
   */
  getBestProvider(providerNames?: string[]): string | null {
    const availableProviders = providerNames || this.getProviderNames()
    let bestProvider: string | null = null
    let bestScore = -1

    for (const providerName of availableProviders) {
      const status = this.getProviderStatus(providerName)
      if (status && status.canMakeRequest) {
        // Score based on remaining capacity (weighted by time period)
        const score = (status.remainingDay * 1) + (status.remainingHour * 24) + (status.remainingMinute * 1440)
        if (score > bestScore) {
          bestScore = score
          bestProvider = providerName
        }
      }
    }

    return bestProvider
  }
}

// Singleton instance
export const apiLimitsTracker = new ApiLimitsTracker()

// Convenience functions
export function recordApiCall(providerName: string, isSuccess: boolean = true, error?: string): void {
  apiLimitsTracker.recordCall(providerName, isSuccess, error)
}

export function canMakeApiRequest(providerName: string): boolean {
  return apiLimitsTracker.canMakeRequest(providerName)
}

export function getApiProviderStatus(providerName: string): ApiLimitStatus | null {
  return apiLimitsTracker.getProviderStatus(providerName)
}

export function getAllApiStatus(): ApiLimitsSummary {
  return apiLimitsTracker.getAllProvidersStatus()
}

export function hasApiCriticalLimits(): boolean {
  return apiLimitsTracker.hasCriticalLimits()
}

export function getBestApiProvider(providerNames?: string[]): string | null {
  return apiLimitsTracker.getBestProvider(providerNames)
}

export function resetApiUsage(providerName?: string): void {
  apiLimitsTracker.resetUsage(providerName)
} 