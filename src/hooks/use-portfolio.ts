import { useQuery } from '@tanstack/react-query'
import type { PortfolioData, SectorData, FundamentalsData } from '@/lib/types'

export function usePortfolio() {
  return useQuery<PortfolioData>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch portfolio')
      }
      return res.json()
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useSectorEnrichment(isins: string[]) {
  return useQuery<Record<string, SectorData>>({
    queryKey: ['sectors', isins.sort().join(',')],
    queryFn: async () => {
      const res = await fetch('/api/enrich/sectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isins }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to enrich sectors')
      }
      return res.json()
    },
    enabled: isins.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (sectors don't change often)
  })
}

export function useFundamentals(tickers: string[]) {
  return useQuery<Record<string, FundamentalsData>>({
    queryKey: ['fundamentals', tickers.sort().join(',')],
    queryFn: async () => {
      const res = await fetch('/api/enrich/fundamentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to enrich fundamentals')
      }
      return res.json()
    },
    enabled: tickers.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
