"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, Download, FileText, Info } from 'lucide-react'
import { Trading212Position } from '@/lib/types'
import { trading212Cache } from '@/lib/trading212-cache'
import { 
  exportPositionsToCSV, 
  exportPortfolioSummaryToCSV,
  calculatePortfolioSummary,
  ExportablePosition
} from '@/lib/export-utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FilterPanel } from '@/components/filter-panel'
import { useFilterSort } from '@/hooks/use-filter-sort'
import { FilterablePosition } from '@/lib/filter-utils'

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

export function RealPositionsTable() {
  const [positions, setPositions] = useState<Trading212Position[]>([])
  const [account, setAccount] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convert positions to filterable positions (basic version without enrichment)
  const filterablePositions = useMemo((): FilterablePosition[] => {
    return positions.map(pos => ({
      ticker: pos.ticker,
      companyName: pos.ticker, // Use ticker as company name for basic table
      sector: undefined, // No sector data in basic positions
      industry: undefined,
      country: undefined,
      exchange: undefined,
      marketCap: undefined,
      peRatio: undefined,
      dividendYield: undefined,
      eps: undefined,
      beta: undefined,
      currentPrice: pos.currentPrice,
      quantity: pos.quantity,
      ppl: pos.ppl,
      averagePrice: pos.averagePrice,
      initialFillDate: pos.initialFillDate,
    }))
  }, [positions])

  // Calculate total portfolio value
  const totalPortfolioValue = useMemo(() => {
    return positions.reduce((total, pos) => total + (pos.currentPrice * pos.quantity), 0)
  }, [positions])

  // Use filter and sort hook
  const {
    positions: filteredPositions,
    updateFilters,
    updateSorts,
    updatePresets,
    filterStats,
  } = useFilterSort(filterablePositions, totalPortfolioValue)

  const fetchData = async (forceRefresh = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (forceRefresh) {
        // Use safe refresh that respects rate limits
        const { positions, account } = await trading212Cache.safeRefresh()
        setPositions(positions)
        setAccount(account)
      } else {
        // Use cache to prevent rate limiting
        const [positionsData, accountData] = await Promise.all([
          trading212Cache.getPositions(),
          trading212Cache.getAccount()
        ])
        setPositions(positionsData)
        setAccount(accountData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    fetchData(true) // Safe refresh that respects rate limits
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatTicker = (ticker: string) => {
    // Convert AAPL_US_EQ to AAPL
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

  const handleExportPositionsCSV = () => {
    // Use filtered positions for export
    const exportablePositions: ExportablePosition[] = filteredPositions.map(pos => ({
      ...pos,
      marketValue: pos.currentPrice * pos.quantity,
      pnlPercent: (pos.ppl / (pos.currentPrice * pos.quantity)) * 100
    }))
    
    exportPositionsToCSV(exportablePositions, `basic-positions-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleExportSummaryCSV = () => {
    if (!account) return
    
    // Use filtered positions for export
    const exportablePositions: ExportablePosition[] = filteredPositions.map(pos => ({
      ...pos,
      marketValue: pos.currentPrice * pos.quantity,
      pnlPercent: (pos.ppl / (pos.currentPrice * pos.quantity)) * 100
    }))
    
    const summary = calculatePortfolioSummary(exportablePositions)
    exportPortfolioSummaryToCSV(summary, `portfolio-summary-${new Date().toISOString().split('T')[0]}.csv`)
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
            <div>
              <CardTitle>Live Portfolio Positions</CardTitle>
              <CardDescription>
                Real-time data from your Trading212 account
              </CardDescription>
            </div>
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
                <DropdownMenuItem onClick={handleExportPositionsCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Positions CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSummaryCSV} disabled={!account}>
                  <FileText className="h-4 w-4 mr-2" />
                  Portfolio Summary CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Account Summary */}
        {account && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-3">Account Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex justify-between sm:block">
                <div className="text-muted-foreground">Total Value</div>
                <div className="font-medium text-lg sm:text-base">{formatCurrency(account.total)}</div>
              </div>
              <div className="flex justify-between sm:block">
                <div className="text-muted-foreground">Invested</div>
                <div className="font-medium text-lg sm:text-base">{formatCurrency(account.invested)}</div>
              </div>
              <div className="flex justify-between sm:block">
                <div className="text-muted-foreground">Cash</div>
                <div className="font-medium text-lg sm:text-base">{formatCurrency(account.free)}</div>
              </div>
              <div className="flex justify-between sm:block">
                <div className="text-muted-foreground">P&L</div>
                <div className={`font-medium flex items-center gap-1 text-lg sm:text-base ${getPnLColor(account.ppl)}`}>
                  {getPnLIcon(account.ppl)}
                  {formatCurrency(account.ppl)}
                </div>
              </div>
            </div>
          </div>
        )}

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
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading positions...</span>
          </div>
        )}

        {/* Positions Table - Desktop */}
        <div className="hidden lg:block">
          {!isLoading && filteredPositions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Avg Price</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Market Value</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>P&L %</TableHead>
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
                      <TableCell>{position.quantity}</TableCell>
                      <TableCell>{formatCurrency(position.averagePrice)}</TableCell>
                      <TableCell>{formatCurrency(position.currentPrice)}</TableCell>
                      <TableCell>{formatCurrency(value)}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${getPnLColor(position.ppl)}`}>
                          {getPnLIcon(position.ppl)}
                          {formatCurrency(position.ppl)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={pnlPercent > 0 ? "default" : pnlPercent < 0 ? "destructive" : "secondary"}
                          className={pnlPercent > 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                        >
                          {pnlPercent > 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Positions Cards - Mobile & Tablet */}
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{formatTicker(position.ticker)}</span>
                          <Badge variant="outline" className="text-xs">
                            {position.quantity} shares
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatCurrency(value)}</div>
                          <div className="text-sm text-muted-foreground">Market Value</div>
                        </div>
                      </div>

                      {/* Price Info */}
                      <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Avg Price</div>
                          <div className="font-medium">{formatCurrency(position.averagePrice)}</div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="text-sm text-muted-foreground">Current Price</div>
                          <div className="font-medium">{formatCurrency(position.currentPrice)}</div>
                        </div>
                      </div>

                      {/* Performance Row */}
                      <div className="flex items-center justify-between">
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
                        <div className="text-right text-sm text-muted-foreground">
                          <div>P&L</div>
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
        {!isLoading && !error && filteredPositions.length === 0 && positions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No positions found in your Trading212 account.</p>
            <p className="text-sm mt-2">Make sure you have some investments in your portfolio.</p>
          </div>
        )}
        
        {/* No Results After Filtering */}
        {!isLoading && !error && filteredPositions.length === 0 && positions.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No positions match your current filters.</p>
            <p className="text-sm mt-2">Try adjusting your filters or clearing them to see all positions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
  )
} 