import { TiingoFundamentals } from './tiingo-client'

export interface CachedTiingoFundamentals {
  data: TiingoFundamentals | null
  cachedAt: number
  expiresAt: number
}

class TiingoLocalCache {
  private readonly CACHE_KEY = 'tiingo_fundamentals'
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private cache: Map<string, CachedTiingoFundamentals> = new Map()
  private isLoaded = false

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return // SSR safety
    
    try {
      const stored = localStorage.getItem(this.CACHE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.cache = new Map(Object.entries(parsed))
        console.log(`📦 Loaded ${this.cache.size} cached Tiingo fundamentals from localStorage`)
      }
    } catch (error) {
      console.warn('Failed to load Tiingo cache from localStorage:', error)
    }
    this.isLoaded = true
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return // SSR safety
    
    try {
      const cacheObj = Object.fromEntries(this.cache)
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheObj))
      console.log(`💾 Saved ${this.cache.size} Tiingo fundamentals to localStorage`)
    } catch (error) {
      console.warn('Failed to save Tiingo cache to localStorage:', error)
    }
  }

  get(symbol: string): CachedTiingoFundamentals | null {
    if (!this.isLoaded) this.loadFromStorage()
    
    const cached = this.cache.get(symbol)
    if (!cached) return null
    
    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(symbol)
      this.saveToStorage()
      return null
    }
    
    return cached
  }

  set(symbol: string, data: TiingoFundamentals | null): void {
    if (!this.isLoaded) this.loadFromStorage()
    
    const now = Date.now()
    const cached: CachedTiingoFundamentals = {
      data,
      cachedAt: now,
      expiresAt: now + this.CACHE_DURATION
    }
    
    this.cache.set(symbol, cached)
    this.saveToStorage()
  }

  has(symbol: string): boolean {
    return this.get(symbol) !== null
  }

  getCacheInfo(): { size: number; symbols: string[]; oldestCache: number | null } {
    if (!this.isLoaded) this.loadFromStorage()
    
    const symbols = Array.from(this.cache.keys())
    const oldestCache = symbols.length > 0 
      ? Math.min(...Array.from(this.cache.values()).map(c => c.cachedAt))
      : null
    
    return {
      size: this.cache.size,
      symbols,
      oldestCache
    }
  }

  clear(): void {
    this.cache.clear()
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.CACHE_KEY)
    }
    console.log('🗑️ Cleared Tiingo cache')
  }

  // Remove expired entries
  cleanup(): void {
    if (!this.isLoaded) this.loadFromStorage()
    
    const now = Date.now()
    let removedCount = 0
    
    for (const [symbol, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(symbol)
        removedCount++
      }
    }
    
    if (removedCount > 0) {
      this.saveToStorage()
      console.log(`🧹 Cleaned up ${removedCount} expired Tiingo cache entries`)
    }
  }

  // Get symbols that need fresh data
  getSymbolsToRefresh(symbols: string[]): string[] {
    if (!this.isLoaded) this.loadFromStorage()
    
    return symbols.filter(symbol => !this.has(symbol))
  }

  // Get cache statistics
  getStats(): { 
    totalCached: number
    expired: number
    fresh: number
    cacheHitRate: number
    averageAge: number
  } {
    if (!this.isLoaded) this.loadFromStorage()
    
    const now = Date.now()
    const entries = Array.from(this.cache.values())
    
    const totalCached = entries.length
    const expired = entries.filter(e => now > e.expiresAt).length
    const fresh = totalCached - expired
    const cacheHitRate = totalCached > 0 ? (fresh / totalCached) * 100 : 0
    const averageAge = entries.length > 0 
      ? entries.reduce((sum, e) => sum + (now - e.cachedAt), 0) / entries.length / (60 * 60 * 1000) // in hours
      : 0
    
    return {
      totalCached,
      expired,
      fresh,
      cacheHitRate,
      averageAge
    }
  }
}

// Singleton instance
export const tiingoCache = new TiingoLocalCache() 