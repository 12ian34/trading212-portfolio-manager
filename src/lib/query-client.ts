import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes for most data
      staleTime: 5 * 60 * 1000,
      // Cache time: 10 minutes 
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
})

// Query keys for consistent cache management
export const queryKeys = {
  // Trading212 queries
  trading212: {
    all: ['trading212'] as const,
    account: () => [...queryKeys.trading212.all, 'account'] as const,
    positions: () => [...queryKeys.trading212.all, 'positions'] as const,
    position: (ticker: string) => [...queryKeys.trading212.all, 'position', ticker] as const,
    summary: () => [...queryKeys.trading212.all, 'summary'] as const,
    test: () => [...queryKeys.trading212.all, 'test'] as const,
  },
  
  // Alpha Vantage queries
  alphaVantage: {
    all: ['alphaVantage'] as const,
    overview: (symbol: string) => [...queryKeys.alphaVantage.all, 'overview', symbol] as const,
    multipleOverviews: (symbols: string[]) => [
      ...queryKeys.alphaVantage.all, 
      'multipleOverviews', 
      symbols.sort().join(',')
    ] as const,
    test: () => [...queryKeys.alphaVantage.all, 'test'] as const,
  },
  
  // Portfolio queries (combining both APIs)
  portfolio: {
    all: ['portfolio'] as const,
    enhanced: () => [...queryKeys.portfolio.all, 'enhanced'] as const,
    metrics: () => [...queryKeys.portfolio.all, 'metrics'] as const,
    sectors: () => [...queryKeys.portfolio.all, 'sectors'] as const,
    regions: () => [...queryKeys.portfolio.all, 'regions'] as const,
    risks: () => [...queryKeys.portfolio.all, 'risks'] as const,
  },
  
  // Connection tests
  connections: {
    all: ['connections'] as const,
    test: () => [...queryKeys.connections.all, 'test'] as const,
  },
} as const

// Cache tags for bulk invalidation
export const cacheTags = {
  TRADING212_DATA: 'trading212-data',
  ALPHAVANTAGE_DATA: 'alphavantage-data', 
  PORTFOLIO_DATA: 'portfolio-data',
  CONNECTION_STATUS: 'connection-status',
} as const 