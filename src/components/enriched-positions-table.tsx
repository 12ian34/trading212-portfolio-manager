"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, Building, Globe, DollarSign } from 'lucide-react'
import { Trading212Position } from '@/lib/types'
import { trading212Cache } from '@/lib/trading212-cache'

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Enhanced Portfolio Positions</CardTitle>
            <CardDescription>
              Trading212 positions enriched with fundamental data from Alpha Vantage
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAndEnrichPositions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isEnriching ? 'Enriching...' : 'Refresh'}
          </Button>
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

        {/* Enhanced Positions Table */}
        {!isLoading && enrichedPositions.length > 0 && (
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
              {enrichedPositions.map((position) => {
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

        {/* Empty State */}
        {!isLoading && !error && enrichedPositions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No positions found in your Trading212 account.</p>
            <p className="text-sm mt-2">Make sure you have some investments in your portfolio.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 