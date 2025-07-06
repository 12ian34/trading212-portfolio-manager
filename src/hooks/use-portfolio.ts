import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
// import { Trading212Position, Trading212Account, AlphaVantageOverview } from '@/lib/types'

// Internal API client functions
async function fetchTradingPositions() {
  const response = await fetch('/api/trading212/positions')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch positions')
  }
  return response.json()
}

async function fetchTradingAccount() {
  const response = await fetch('/api/trading212/account')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch account')
  }
  return response.json()
}

async function fetchStockOverview(symbol: string) {
  const response = await fetch(`/api/alphavantage/overview?symbol=${symbol}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Failed to fetch overview for ${symbol}`)
  }
  return response.json()
}

/**
 * Hook for getting enhanced portfolio data (Trading212 + Alpha Vantage)
 */
export function useEnhancedPortfolio() {
  return useQuery({
    queryKey: queryKeys.portfolio.enhanced(),
    queryFn: async () => {
      // For now, return mock data until we implement the enhanced portfolio logic
      const positions = await fetchTradingPositions()
      return {
        totalValue: 12345.67,
        dailyChange: 234.56,
        dailyChangePercent: 2.34,
        positions: positions,
        metrics: {
          riskScore: 65,
          diversificationScore: 75,
          concentrationRisk: 'Medium',
        },
        sectorAllocation: [],
        regionAllocation: [],
        lastUpdated: new Date().toISOString(),
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for portfolio data
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Don't retry on API key errors
      if (error.message?.includes('API key')) {
        return false
      }
      return failureCount < 3
    },
  })
}

/**
 * Hook for getting Trading212 positions
 */
export function useTradingPositions() {
  return useQuery({
    queryKey: queryKeys.trading212.positions(),
    queryFn: fetchTradingPositions,
    staleTime: 1 * 60 * 1000, // 1 minute for positions
    gcTime: 3 * 60 * 1000, // 3 minutes cache
  })
}

/**
 * Hook for getting Trading212 account information
 */
export function useTradingAccount() {
  return useQuery({
    queryKey: queryKeys.trading212.account(),
    queryFn: fetchTradingAccount,
    staleTime: 5 * 60 * 1000, // 5 minutes for account data
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  })
}

/**
 * Hook for getting Alpha Vantage overview for a specific symbol
 */
export function useStockOverview(symbol: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.alphaVantage.overview(symbol),
    queryFn: () => fetchStockOverview(symbol),
    enabled: enabled && Boolean(symbol),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours for fundamentals
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache
    retry: 2, // Less retries for individual stocks
  })
}

/**
 * Hook for getting Alpha Vantage overviews for multiple symbols
 */
export function useMultipleStockOverviews(symbols: string[], enabled = true) {
  return useQuery({
    queryKey: queryKeys.alphaVantage.multipleOverviews(symbols),
    queryFn: async () => {
      // Fetch overviews for all symbols in parallel
      const promises = symbols.map(symbol => fetchStockOverview(symbol))
      const results = await Promise.allSettled(promises)
      
      const overviews: Record<string, unknown> = {}
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          overviews[symbols[index]] = result.value
        }
      })
      
      return overviews
    },
    enabled: enabled && symbols.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours for fundamentals
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache
    retry: 1, // Minimal retries for batch requests
  })
}

/**
 * Hook for testing API connections
 */
export function useConnectionTest() {
  return useQuery({
    queryKey: queryKeys.connections.test(),
    queryFn: async () => {
      // Test both APIs
      const [trading212Response, alphaVantageResponse] = await Promise.allSettled([
        fetch('/api/trading212/positions'),
        fetch('/api/alphavantage/overview?symbol=AAPL')
      ])
      
      return {
        trading212: {
          status: trading212Response.status === 'fulfilled' && trading212Response.value.ok ? 'connected' : 'error'
        },
        alphaVantage: {
          status: alphaVantageResponse.status === 'fulfilled' && alphaVantageResponse.value.ok ? 'connected' : 'error'
        }
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute cache
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/**
 * Mutation hook for refreshing portfolio data
 */
export function useRefreshPortfolio() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      // Clear relevant caches
      await queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.trading212.all })
      
      // Refetch fresh data by invalidating the enhanced portfolio query
      await queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.enhanced() })
      
      return 'Portfolio refreshed successfully'
    },
    onSuccess: () => {
      console.log('Portfolio data refreshed successfully')
    },
    onError: (error) => {
      console.error('Failed to refresh portfolio:', error)
    },
  })
}

/**
 * Hook for getting portfolio metrics only
 */
export function usePortfolioMetrics() {
  const { data: portfolio, ...rest } = useEnhancedPortfolio()
  
  return {
    data: portfolio?.metrics,
    ...rest,
  }
}

/**
 * Hook for getting sector allocation data
 */
export function useSectorAllocation() {
  const { data: portfolio, ...rest } = useEnhancedPortfolio()
  
  return {
    data: portfolio?.sectorAllocation || [],
    ...rest,
  }
}

/**
 * Hook for getting region allocation data
 */
export function useRegionAllocation() {
  const { data: portfolio, ...rest } = useEnhancedPortfolio()
  
  return {
    data: portfolio?.regionAllocation || [],
    ...rest,
  }
}

/**
 * Hook for getting portfolio positions with enhanced data
 */
export function usePortfolioPositions() {
  const { data: portfolio, ...rest } = useEnhancedPortfolio()
  
  return {
    data: portfolio?.positions || [],
    ...rest,
  }
}

/**
 * Custom hook for handling portfolio loading states
 */
export function usePortfolioState() {
  const portfolio = useEnhancedPortfolio()
  const connectionTest = useConnectionTest()
  
  return {
    // Data
    portfolio: portfolio.data,
    
    // Loading states
    isLoading: portfolio.isLoading,
    isRefetching: portfolio.isRefetching,
    isTestingConnection: connectionTest.isLoading,
    
    // Error states
    error: portfolio.error,
    connectionError: connectionTest.error,
    
    // Connection status
    connections: connectionTest.data,
    
    // Fetch status
    isFetched: portfolio.isFetched,
    isStale: portfolio.isStale,
    
    // Last updated
    lastUpdated: portfolio.data?.lastUpdated,
    dataUpdatedAt: portfolio.dataUpdatedAt,
    
    // Actions
    refetch: portfolio.refetch,
    testConnections: connectionTest.refetch,
  }
}

/**
 * Hook for cache management utilities
 */
export function usePortfolioCache() {
  const queryClient = useQueryClient()
  
  return {
    // Clear all portfolio data
    clearPortfolioCache: () => {
      queryClient.removeQueries({ queryKey: queryKeys.portfolio.all })
    },
    
    // Clear Trading212 data
    clearTradingCache: () => {
      queryClient.removeQueries({ queryKey: queryKeys.trading212.all })
    },
    
    // Clear Alpha Vantage data
    clearAlphaVantageCache: () => {
      queryClient.removeQueries({ queryKey: queryKeys.alphaVantage.all })
    },
    
    // Clear all caches
    clearAllCache: () => {
      queryClient.clear()
    },
    
    // Get cache statistics
    getCacheStats: () => {
      const cache = queryClient.getQueryCache()
      return {
        queryCount: cache.getAll().length,
        queries: cache.getAll().map(query => ({
          queryKey: query.queryKey,
          state: query.state.status,
          dataUpdatedAt: query.state.dataUpdatedAt,
          isStale: query.isStale(),
        })),
      }
    },
  }
} 