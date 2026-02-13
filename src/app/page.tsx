"use client"

import { useMemo } from "react"
import { usePortfolio, useSectorEnrichment, useFundamentals } from "@/hooks/use-portfolio"
import { isUSStock, toPlainSymbol } from "@/lib/types"
import { PortfolioOverview } from "@/components/portfolio-overview"
import { PositionsTable } from "@/components/positions-table"
import { SectorChart } from "@/components/sector-chart"
import { RegionChart } from "@/components/region-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const { data: portfolio, isLoading, error, refetch, isRefetching } = usePortfolio()

  // Derive ISINs and US tickers for enrichment
  const isins = useMemo(
    () => portfolio?.positions.map((p) => p.isin) ?? [],
    [portfolio]
  )

  const usTickers = useMemo(
    () =>
      portfolio?.positions
        .filter((p) => isUSStock(p.ticker))
        .map((p) => toPlainSymbol(p.ticker)) ?? [],
    [portfolio]
  )

  // Progressive enrichment
  const { data: sectorData } = useSectorEnrichment(isins)
  const { data: fundamentalsData } = useFundamentals(usTickers)

  // Merge enrichment data into positions
  const enrichedPositions = useMemo(() => {
    if (!portfolio) return []

    return portfolio.positions.map((p) => {
      const figi = sectorData?.[p.isin]
      const plainSymbol = toPlainSymbol(p.ticker).toUpperCase()
      const fundamentals = fundamentalsData?.[plainSymbol]

      // Tiingo gives real business sectors for US stocks.
      // OpenFIGI only gives asset class ("Equity") - not useful for sector charts.
      // For non-US stocks without Tiingo data, sector stays undefined.
      const sector = fundamentals?.sector && fundamentals.sector !== "Unknown"
        ? fundamentals.sector
        : undefined
      const industry = fundamentals?.industry && fundamentals.industry !== "Unknown"
        ? fundamentals.industry
        : figi?.industry !== "Common Stock" ? figi?.industry : undefined

      return {
        ...p,
        sector,
        industry,
        marketCap: fundamentals?.marketCap ?? p.marketCap,
        peRatio: fundamentals?.peRatio ?? p.peRatio,
        pbRatio: fundamentals?.pbRatio ?? p.pbRatio,
        enterpriseVal: fundamentals?.enterpriseVal ?? p.enterpriseVal,
      }
    })
  }, [portfolio, sectorData, fundamentalsData])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <div className="ml-2">
          <p className="font-medium">Failed to load portfolio</p>
          <p className="text-sm">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </Alert>
    )
  }

  if (!portfolio) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <PortfolioOverview
        account={portfolio.account}
        positionCount={enrichedPositions.length}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectorChart positions={enrichedPositions} />
        <RegionChart positions={enrichedPositions} />
      </div>

      <PositionsTable positions={enrichedPositions} />
    </div>
  )
}
