"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, Building, Globe, DollarSign, Download, FileText, Info } from 'lucide-react'
import { Trading212Position } from '@/lib/types'
import { trading212Cache } from '@/lib/trading212-cache'
import { 
  exportPositionsToCSV, 
  exportPortfolioToPDF, 
  calculatePortfolioSummary, 
  calculateSectorAllocation, 
  calculateRegionalAllocation,
  ExportablePosition
} from '@/lib/export-utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FilterPanel } from '@/components/filter-panel'
import { useFilterSort } from '@/hooks/use-filter-sort'
import { FilterablePosition } from '@/lib/filter-utils'
import { useApiWarning, ApiActions } from '@/components/api-warning-dialog'
import { ApiEnhancedButton, ApiUsageBadge } from '@/components/api-enhanced-button'
import { EnrichmentHelp, DataFreshnessHelp } from '@/components/contextual-help'

interface EnrichedPosition extends Trading212Position {
  // Alpha Vantage fundamental data
  companyName?: string
  sector?: string
  industry?: string
  country?: string
  exchange?: string
  marketCap?: number
  peRatio?: number
  eps?: number
  dividendYield?: number
  beta?: number
  description?: string
  // Cache metadata
  isCached?: boolean
  cacheAge?: number
}

interface EnrichmentResponse {
  enrichedPositions: EnrichedPosition[]
  summary: {
    totalProcessed: number
    fromCache: number
    freshlyFetched: number
    skippedOrFailed: number
    dailyApiUsage: string
    cacheHitRate: string
  }
}

export function EnrichedPositionsTable() {
  const [enrichedPositions, setEnrichedPositions] = useState<EnrichedPosition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enrichmentStats, setEnrichmentStats] = useState<{ total: number, enriched: number } | null>(null)
  
  // API warning hook
  const { showWarning, WarningDialog } = useApiWarning()

  // Convert enriched positions to filterable positions
  const filterablePositions = useMemo((): FilterablePosition[] => {
    return enrichedPositions.map(pos => ({
      ticker: pos.ticker,
      companyName: pos.companyName,
      sector: pos.sector,
      industry: pos.industry,
      country: pos.country,
      exchange: pos.exchange,
      marketCap: pos.marketCap,
      peRatio: pos.peRatio,
      dividendYield: pos.dividendYield,
      eps: pos.eps,
      beta: pos.beta,
      currentPrice: pos.currentPrice,
      quantity: pos.quantity,
      ppl: pos.ppl,
      averagePrice: pos.averagePrice,
      initialFillDate: pos.initialFillDate,
    }))
  }, [enrichedPositions])

  // Calculate total portfolio value
  const totalPortfolioValue = useMemo(() => {
    return enrichedPositions.reduce((total, pos) => total + (pos.currentPrice * pos.quantity), 0)
  }, [enrichedPositions])

  // Use filter and sort hook
  const {
    positions: filteredPositions,
    updateFilters,
    updateSorts,
    updatePresets,
    filterStats,
  } = useFilterSort(filterablePositions, totalPortfolioValue)

  const fetchAndEnrichPositions = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // First get Trading212 positions
      console.log('📊 Fetching Trading212 positions...')
      const positions = await trading212Cache.getPositions()
      console.log(`✅ Got ${positions.length} positions from Trading212`)
      
      if (positions.length === 0) {
        setEnrichedPositions([])
        setEnrichmentStats({ total: 0, enriched: 0 })
        return
      }
      
      // Then enrich with Alpha Vantage data
      setIsEnriching(true)
      console.log('🔍 Enriching positions with fundamental data...')
      
      const enrichResponse = await fetch('/api/tiingo/enrich-positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positions }),
      })

      if (!enrichResponse.ok) {
        throw new Error(`Failed to enrich positions: ${enrichResponse.status}`)
      }

      const enrichmentData: EnrichmentResponse = await enrichResponse.json()
      
      setEnrichedPositions(enrichmentData.enrichedPositions)
      setEnrichmentStats({
        total: enrichmentData.summary.totalProcessed,
        enriched: enrichmentData.summary.fromCache + enrichmentData.summary.freshlyFetched
      })
      
      console.log(`✅ Enrichment complete: ${enrichmentData.summary.fromCache + enrichmentData.summary.freshlyFetched}/${enrichmentData.summary.totalProcessed} positions enriched (Cache: ${enrichmentData.summary.cacheHitRate})`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch and enrich positions')
      console.error('❌ Error fetching/enriching positions:', err)
    } finally {
      setIsLoading(false)
      setIsEnriching(false)
    }
  }

  const handleRefreshWithWarning = () => {
    // Get current positions count to estimate API calls
    const currentPositionsCount = enrichedPositions.length || 10 // Default estimate
    
    showWarning(
      ApiActions.enrichPositions(currentPositionsCount),
      fetchAndEnrichPositions,
      () => {
        console.log('User cancelled enrichment')
      }
    )
  }

  useEffect(() => {
    fetchAndEnrichPositions()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatLargeNumber = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
    return `$${value}`
  }

  const formatTicker = (ticker: string) => {
    return ticker.split('_')[0]
  }

  const calculateValue = (position: Trading212Position) => {
    return position.currentPrice * position.quantity
  }

  const calculatePnLPercent = (position: Trading212Position) => {
    const value = calculateValue(position)
    if (value === 0) return 0
    return (position.ppl / value) * 100
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600 dark:text-green-400'
    if (pnl < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getPnLIcon = (pnl: number) => {
    if (pnl > 0) return <TrendingUp className="h-3 w-3" />
    if (pnl < 0) return <TrendingDown className="h-3 w-3" />
    return null
  }

  const getSectorColor = (sector?: string) => {
    if (!sector) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    
    const sectorColors: Record<string, string> = {
      'Technology': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Healthcare': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Financial Services': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'Consumer Cyclical': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'Consumer Defensive': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Energy': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'Industrials': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    }
    
    return sectorColors[sector] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }

  const handleExportCSV = () => {
    // Use filtered positions for export
    const exportablePositions: ExportablePosition[] = filteredPositions.map(pos => {
      const originalPos = enrichedPositions.find(ep => ep.ticker === pos.ticker)
      return {
        ...originalPos,
        ...pos,
        marketValue: pos.currentPrice * pos.quantity,
        pnlPercent: (pos.ppl / (pos.currentPrice * pos.quantity)) * 100
      }
    })
    
    exportPositionsToCSV(exportablePositions)
  }

  const handleExportPDF = async () => {
    // Use filtered positions for export
    const exportablePositions: ExportablePosition[] = filteredPositions.map(pos => {
      const originalPos = enrichedPositions.find(ep => ep.ticker === pos.ticker)
      return {
        ...originalPos,
        ...pos,
        marketValue: pos.currentPrice * pos.quantity,
        pnlPercent: (pos.ppl / (pos.currentPrice * pos.quantity)) * 100
      }
    })
    
    const summary = calculatePortfolioSummary(exportablePositions)
    const sectorData = calculateSectorAllocation(exportablePositions)
    const regionalData = calculateRegionalAllocation(exportablePositions)
    
    await exportPortfolioToPDF(exportablePositions, summary, sectorData, regionalData)
  }

  return (
    <div className="space-y-4">
      {/* Filter Panel */}
      <FilterPanel
        positions={filterablePositions}
        onFilterChange={updateFilters}
        onSortChange={updateSorts}
        onPresetsChange={updatePresets}
      />

      {/* Results Summary */}
      {filterStats.hasFilters && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Showing {filterStats.filteredCount} of {filterStats.originalCount} positions
            {filterStats.removedCount > 0 && (
              <span className="text-orange-600 dark:text-orange-400">
                {' '}({filterStats.removedCount} filtered out)
              </span>
            )}
            {filterStats.activePresetName && (
              <span className="text-blue-600 dark:text-blue-400">
                {' '}• Active preset: {filterStats.activePresetName}
              </span>
            )}
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Enhanced Portfolio Positions</CardTitle>
                  <EnrichmentHelp />
                </div>
                <CardDescription className="flex items-center gap-2">
                  Trading212 positions enriched with fundamental data from Alpha Vantage
                  <DataFreshnessHelp />
                </CardDescription>
              </div>
            </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isLoading || filteredPositions.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download PDF Report
                </DropdownMenuItem>
                              </DropdownMenuContent>
              </DropdownMenu>
              <ApiUsageBadge 
                apiAction={ApiActions.enrichPositions(enrichedPositions.length || 10)}
                className="ml-1"
              />
            </div>
              <ApiEnhancedButton
              apiAction={ApiActions.enrichPositions(enrichedPositions.length || 10)}
              onApiAwareClick={handleRefreshWithWarning}
              disabled={isLoading}
              showUsageIndicator={true}
              showRemainingCount={true}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isEnriching ? 'Enriching...' : 'Refresh'}
            </ApiEnhancedButton>
          </div>
        </div>
        
        {/* Enrichment Status */}
        {enrichmentStats && (
          <div className="flex items-center gap-4 mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="text-sm">
                <strong>{enrichmentStats.enriched}</strong> of <strong>{enrichmentStats.total}</strong> positions enriched
              </span>
            </div>
            {enrichmentStats.enriched < enrichmentStats.total && (
              <div className="text-sm text-muted-foreground">
                Some positions may not have fundamental data available
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg mb-4">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin mr-2" />
            <span>{isEnriching ? 'Enriching positions with fundamental data...' : 'Loading positions...'}</span>
          </div>
        )}

        {/* Enhanced Positions Table - Desktop */}
        <div className="hidden lg:block">
          {!isLoading && filteredPositions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Market Value</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>PE Ratio</TableHead>
                  <TableHead>Market Cap</TableHead>
                  <TableHead>Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((position) => {
                  const value = calculateValue(position)
                  const pnlPercent = calculatePnLPercent(position)
                  
                  return (
                    <TableRow key={position.ticker}>
                      <TableCell className="font-medium">
                        {formatTicker(position.ticker)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {position.companyName || 'Unknown Company'}
                          </span>
                          {position.industry && (
                            <span className="text-xs text-muted-foreground">
                              {position.industry}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {position.sector ? (
                          <Badge className={getSectorColor(position.sector)}>
                            {position.sector}
                          </Badge>
                        ) : (
                          <Badge variant="outline">N/A</Badge>
                        )}
                      </TableCell>
                      <TableCell>{position.quantity}</TableCell>
                      <TableCell>{formatCurrency(position.currentPrice)}</TableCell>
                      <TableCell>{formatCurrency(value)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className={`flex items-center gap-1 ${getPnLColor(position.ppl)}`}>
                            {getPnLIcon(position.ppl)}
                            {formatCurrency(position.ppl)}
                          </div>
                          <Badge 
                            variant={pnlPercent > 0 ? "default" : pnlPercent < 0 ? "destructive" : "secondary"}
                            className={pnlPercent > 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                          >
                            {pnlPercent > 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {position.peRatio ? (
                          <span className="font-medium">{position.peRatio.toFixed(1)}</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {position.marketCap ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatLargeNumber(position.marketCap)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {position.country ? (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {position.country}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Enhanced Positions Cards - Mobile & Tablet */}
        <div className="lg:hidden">
          {!isLoading && filteredPositions.length > 0 && (
            <div className="space-y-4">
              {filteredPositions.map((position) => {
                const value = calculateValue(position)
                const pnlPercent = calculatePnLPercent(position)
                
                return (
                  <Card key={position.ticker} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold">{formatTicker(position.ticker)}</span>
                          {position.sector && (
                            <Badge className={getSectorColor(position.sector)}>
                              {position.sector}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatCurrency(value)}</div>
                          <div className="text-sm text-muted-foreground">Market Value</div>
                        </div>
                      </div>

                      {/* Company Info */}
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {position.companyName || 'Unknown Company'}
                        </div>
                        {position.industry && (
                          <div className="text-xs text-muted-foreground">
                            {position.industry}
                          </div>
                        )}
                      </div>

                      {/* Performance Row */}
                      <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 ${getPnLColor(position.ppl)}`}>
                            {getPnLIcon(position.ppl)}
                            <span className="font-medium">{formatCurrency(position.ppl)}</span>
                          </div>
                          <Badge 
                            variant={pnlPercent > 0 ? "default" : pnlPercent < 0 ? "destructive" : "secondary"}
                            className={pnlPercent > 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                          >
                            {pnlPercent > 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className="text-right text-sm space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">PE:</span>
                            <span className="font-medium">
                              {position.peRatio ? position.peRatio.toFixed(1) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Cap:</span>
                            <span className="font-medium">
                              {position.marketCap ? formatLargeNumber(position.marketCap) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Details Row */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          {position.country && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {position.country}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span>Qty:</span>
                            <span className="font-medium">{position.quantity}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(position.currentPrice)}
                          </div>
                          <div className="text-xs">Current Price</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && !error && filteredPositions.length === 0 && enrichedPositions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No positions found in your Trading212 account.</p>
            <p className="text-sm mt-2">Make sure you have some investments in your portfolio.</p>
          </div>
        )}
        
        {/* No Results After Filtering */}
        {!isLoading && !error && filteredPositions.length === 0 && enrichedPositions.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No positions match your current filters.</p>
            <p className="text-sm mt-2">Try adjusting your filters or clearing them to see all positions.</p>
          </div>
        )}
      </CardContent>
    </Card>
    {WarningDialog}
  </div>
  )
} 