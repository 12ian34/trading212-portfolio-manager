import { Trading212Position } from './types'

// Trading212 API Cache to prevent rate limit violations
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface AccountData {
  cash: number
  free: number
  invested: number
  result: number
  total: number
  ppl: number
  blocked?: number
  dividend?: number
}

class Trading212Cache {
  private positionsCache = new Map<string, CacheEntry<Trading212Position[]>>()
  private accountCache = new Map<string, CacheEntry<AccountData>>()
  private pendingPositionsRequests = new Map<string, Promise<Trading212Position[]>>()
  private pendingAccountRequests = new Map<string, Promise<AccountData>>()
  
  // Rate limits (in milliseconds)
  private readonly POSITIONS_CACHE_DURATION = 5000 // 5 seconds
  private readonly ACCOUNT_CACHE_DURATION = 2000 // 2 seconds
  
  async getPositions(): Promise<Trading212Position[]> {
    const cacheKey = 'positions'
    
    // Check if we have a valid cached response
    const cached = this.positionsCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }
    
    // Check if there's already a pending request
    const pending = this.pendingPositionsRequests.get(cacheKey)
    if (pending) {
      return pending
    }
    
    // Make the request
    const request = this.fetchPositions()
    this.pendingPositionsRequests.set(cacheKey, request)
    
    try {
      const data = await request
      this.positionsCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.POSITIONS_CACHE_DURATION
      })
      return data
    } finally {
      this.pendingPositionsRequests.delete(cacheKey)
    }
  }
  
  async getAccount(): Promise<AccountData> {
    const cacheKey = 'account'
    
    // Check if we have a valid cached response
    const cached = this.accountCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }
    
    // Check if there's already a pending request
    const pending = this.pendingAccountRequests.get(cacheKey)
    if (pending) {
      return pending
    }
    
    // Make the request
    const request = this.fetchAccount()
    this.pendingAccountRequests.set(cacheKey, request)
    
    try {
      const data = await request
      this.accountCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.ACCOUNT_CACHE_DURATION
      })
      return data
    } finally {
      this.pendingAccountRequests.delete(cacheKey)
    }
  }
  
  private async fetchPositions(): Promise<Trading212Position[]> {
    const response = await fetch('/api/trading212/positions')
    if (!response.ok) {
      throw new Error(`Failed to fetch positions: ${response.status}`)
    }
    return response.json()
  }
  
  private async fetchAccount(): Promise<AccountData> {
    const response = await fetch('/api/trading212/account')
    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.status}`)
    }
    return response.json()
  }
  
  // Force refresh by clearing cache (but respect rate limits)
  clearCache(): void {
    this.positionsCache.clear()
    this.accountCache.clear()
  }
  
  // Smart refresh: only refresh if enough time has passed since last request
  canRefresh(type: 'positions' | 'account'): boolean {
    const cache = type === 'positions' ? this.positionsCache : this.accountCache
    const duration = type === 'positions' ? this.POSITIONS_CACHE_DURATION : this.ACCOUNT_CACHE_DURATION
    
    const cached = cache.get(type)
    if (!cached) return true // No cache, can refresh
    
    const timeSinceLastRequest = Date.now() - cached.timestamp
    return timeSinceLastRequest >= duration
  }
  
  // Safe refresh that respects rate limits
  async safeRefresh(): Promise<{ positions: Trading212Position[], account: AccountData }> {
    // Only refresh positions if enough time has passed
    let positionsPromise: Promise<Trading212Position[]>
    if (this.canRefresh('positions')) {
      this.positionsCache.delete('positions')
      positionsPromise = this.getPositions()
    } else {
      positionsPromise = this.getPositions() // Use cached version
    }
    
    // Only refresh account if enough time has passed  
    let accountPromise: Promise<AccountData>
    if (this.canRefresh('account')) {
      this.accountCache.delete('account')
      accountPromise = this.getAccount()
    } else {
      accountPromise = this.getAccount() // Use cached version
    }
    
    const [positions, account] = await Promise.all([positionsPromise, accountPromise])
    return { positions, account }
  }
  
  // Get cache status for debugging
  getCacheStatus(): { positions?: number, account?: number } {
    const status: { positions?: number, account?: number } = {}
    
    const positionsCache = this.positionsCache.get('positions')
    if (positionsCache) {
      status.positions = Math.max(0, positionsCache.expiresAt - Date.now())
    }
    
    const accountCache = this.accountCache.get('account')
    if (accountCache) {
      status.account = Math.max(0, accountCache.expiresAt - Date.now())
    }
    
    return status
  }
}

// Export singleton instance
export const trading212Cache = new Trading212Cache() 