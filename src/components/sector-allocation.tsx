"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, AlertTriangle, TrendingUp, PieChart, BarChart3, Building2, Target, Clock, Zap } from 'lucide-react'
import { trading212Cache } from '@/lib/trading212-cache'

interface SectorData {
  sector: string
  value: number
  percentage: number
  count: number
  avgPE?: number
  companies: string[]
}

interface ConcentrationAlert {
  level: 'low' | 'medium' | 'high'
  message: string
  recommendation: string
}

interface EnrichedPosition {
  ticker: string
  currentPrice: number
  quantity: number
  sector?: string
  companyName?: string
  peRatio?: number
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
    cacheStats: {
      totalCached: number
      expired: number
      fresh: number
      cacheHitRate: number
      averageAge: number
    }
  }
}

export function SectorAllocation() {
  const [sectorData, setSectorData] = useState<SectorData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalValue, setTotalValue] = useState(0)
  const [concentrationAlerts, setConcentrationAlerts] = useState<ConcentrationAlert[]>([])
  const [herfindahlIndex, setHerfindahlIndex] = useState(0)
  const [enrichmentStats, setEnrichmentStats] = useState<EnrichmentResponse['summary'] | null>(null)
  const [showMockData, setShowMockData] = useState(false)

  const fetchSectorData = async () => {
    setIsLoading(true)
    setError(null)
    setShowMockData(false)
    
    try {
      console.log('📊 Fetching Trading212 positions for sector analysis...')
      const positions = await trading212Cache.getPositions()
      
      if (positions.length === 0) {
        setSectorData([])
        setTotalValue(0)
        setEnrichmentStats(null)
        return
      }

      console.log('🔍 Enriching positions with sector data (Tiingo smart cache)...')
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
      const enrichedPos = enrichmentData.enrichedPositions

      setEnrichmentStats(enrichmentData.summary)

      // Calculate sector allocation
      const sectorMap = new Map<string, {
        value: number
        count: number
        companies: string[]
        peRatios: number[]
      }>()

      let total = 0
      
      enrichedPos.forEach((position: EnrichedPosition) => {
        const value = position.currentPrice * position.quantity
        const sector = position.sector || 'Unknown'
        const company = position.companyName || position.ticker.split('_')[0]
        
        total += value
        
        if (!sectorMap.has(sector)) {
          sectorMap.set(sector, {
            value: 0,
            count: 0,
            companies: [],
            peRatios: []
          })
        }
        
        const sectorInfo = sectorMap.get(sector)!
        sectorInfo.value += value
        sectorInfo.count += 1
        sectorInfo.companies.push(company)
        
        if (position.peRatio && position.peRatio > 0) {
          sectorInfo.peRatios.push(position.peRatio)
        }
      })

      setTotalValue(total)

      // Convert to array and calculate percentages
      const sectors: SectorData[] = Array.from(sectorMap.entries())
        .map(([sector, info]) => ({
          sector,
          value: info.value,
          percentage: total > 0 ? (info.value / total) * 100 : 0,
          count: info.count,
          avgPE: info.peRatios.length > 0 
            ? info.peRatios.reduce((sum, pe) => sum + pe, 0) / info.peRatios.length 
            : undefined,
          companies: info.companies
        }))
        .sort((a, b) => b.value - a.value)

      setSectorData(sectors)

      // Calculate concentration metrics
      const hhi = sectors.reduce((sum, sector) => sum + Math.pow(sector.percentage, 2), 0)
      setHerfindahlIndex(hhi)

      // Generate concentration alerts
      const alerts = generateConcentrationAlerts(sectors, hhi)
      setConcentrationAlerts(alerts)

      console.log(`✅ Sector analysis complete: ${sectors.length} sectors, HHI: ${hhi.toFixed(1)}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sector data')
      console.error('❌ Error fetching sector data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMockData = () => {
    // Generate mock sector data for demonstration when hitting rate limits
    const mockSectors: SectorData[] = [
      {
        sector: 'Technology',
        value: 4200,
        percentage: 42.0,
        count: 8,
        avgPE: 28.5,
        companies: ['AAPL', 'GOOG', 'AMD', 'TSM', 'DOCU', 'WIX', 'FB', 'ABNB']
      },
      {
        sector: 'Healthcare',
        value: 2000,
        percentage: 20.0,
        count: 3,
        avgPE: 22.1,
        companies: ['IDXX', 'Unknown', 'Unknown']
      },
      {
        sector: 'Consumer Cyclical',
        value: 1500,
        percentage: 15.0,
        count: 4,
        avgPE: 18.7,
        companies: ['SHOP', 'TTD', 'BABA', 'Unknown']
      },
      {
        sector: 'Industrials',
        value: 1300,
        percentage: 13.0,
        count: 3,
        avgPE: 15.2,
        companies: ['NOC', 'UTX', 'Unknown']
      },
      {
        sector: 'Communication Services',
        value: 700,
        percentage: 7.0,
        count: 2,
        avgPE: 25.8,
        companies: ['TCEHY', 'Unknown']
      },
      {
        sector: 'Unknown',
        value: 300,
        percentage: 3.0,
        count: 5,
        companies: ['FEVRl', 'AAFl', 'BRBYl', 'MONYl', 'ASMLa']
      }
    ]

    setSectorData(mockSectors)
    setTotalValue(10000)
    
    // Calculate HHI for mock data
    const hhi = mockSectors.reduce((sum, sector) => sum + Math.pow(sector.percentage, 2), 0)
    setHerfindahlIndex(hhi)
    
    // Generate alerts for mock data
    const alerts = generateConcentrationAlerts(mockSectors, hhi)
    setConcentrationAlerts(alerts)
    
    setShowMockData(true)
    setError(null)
    
    console.log('📊 Loaded mock sector data for demonstration')
  }

  const generateConcentrationAlerts = (sectors: SectorData[], hhi: number): ConcentrationAlert[] => {
    const alerts: ConcentrationAlert[] = []
    
    // Overall concentration alert
    if (hhi > 2500) {
      alerts.push({
        level: 'high',
        message: 'High portfolio concentration risk',
        recommendation: 'Consider diversifying across more sectors to reduce risk'
      })
    } else if (hhi > 1800) {
      alerts.push({
        level: 'medium',
        message: 'Moderate portfolio concentration',
        recommendation: 'Monitor sector allocation and consider broader diversification'
      })
    }

    // Individual sector concentration alerts
    sectors.forEach(sector => {
      if (sector.percentage > 40) {
        alerts.push({
          level: 'high',
          message: `High concentration in ${sector.sector} (${sector.percentage.toFixed(1)}%)`,
          recommendation: `Consider reducing exposure to ${sector.sector} sector`
        })
      } else if (sector.percentage > 25) {
        alerts.push({
          level: 'medium',
          message: `Moderate concentration in ${sector.sector} (${sector.percentage.toFixed(1)}%)`,
          recommendation: `Monitor ${sector.sector} sector performance closely`
        })
      }
    })

    return alerts
  }

  useEffect(() => {
    fetchSectorData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getSectorColor = (sector: string, index: number) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500',
      'bg-teal-500', 'bg-cyan-500', 'bg-gray-500'
    ]
    return colors[index % colors.length]
  }

  const getAlertColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400'
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/30 dark:text-yellow-400'
      default: return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  const getAlertIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <AlertTriangle className="h-4 w-4" />
      default: return <TrendingUp className="h-4 w-4" />
    }
  }

  const getDiversificationScore = (hhi: number) => {
    if (hhi < 1000) return { score: 'Excellent', color: 'text-green-600 dark:text-green-400' }
    if (hhi < 1800) return { score: 'Good', color: 'text-blue-600 dark:text-blue-400' }
    if (hhi < 2500) return { score: 'Moderate', color: 'text-yellow-600 dark:text-yellow-400' }
    return { score: 'Poor', color: 'text-red-600 dark:text-red-400' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Sector Allocation Analysis
              </CardTitle>
              <CardDescription>
                Portfolio diversification across industry sectors
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMockData}
                disabled={isLoading}
              >
                <Zap className="h-4 w-4 mr-2" />
                Demo Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSectorData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Rate Limit Warning */}
      {enrichmentStats && enrichmentStats.dailyApiUsage.includes('/') && 
       enrichmentStats.dailyApiUsage.split('/')[0] === enrichmentStats.dailyApiUsage.split('/')[1] && (
        <Alert className="border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-900/30 dark:text-orange-400">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Alpha Vantage Daily Limit Reached</strong>
            <br />
            Used {enrichmentStats.dailyApiUsage} daily requests. 
            Some positions processed without sector data. Try the Demo Data button to see full functionality.
          </AlertDescription>
        </Alert>
      )}

      {/* Mock Data Notice */}
      {showMockData && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-400">
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode Active</strong>
            <br />
            Showing example sector allocation data. Click "Refresh" to try loading your real portfolio data.
          </AlertDescription>
        </Alert>
      )}

      {/* Enrichment Status */}
      {enrichmentStats && !showMockData && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">
              <strong>{enrichmentStats.fromCache + enrichmentStats.freshlyFetched}</strong> of <strong>{enrichmentStats.totalProcessed}</strong> positions enriched
            </span>
          </div>
          {enrichmentStats.skippedOrFailed > 0 && (
            <div className="text-sm text-muted-foreground">
              ({enrichmentStats.skippedOrFailed} skipped/failed)
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            API calls: {enrichmentStats.dailyApiUsage} | Cache hit rate: {enrichmentStats.cacheHitRate}
          </div>
        </div>
      )}

      {/* Concentration Alerts */}
      {concentrationAlerts.length > 0 && (
        <div className="space-y-2">
          {concentrationAlerts.map((alert, index) => (
            <Alert key={index} className={getAlertColor(alert.level)}>
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.level)}
                <div className="flex-1">
                  <AlertDescription>
                    <strong>{alert.message}</strong>
                    <br />
                    <span className="text-sm opacity-90">{alert.recommendation}</span>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Diversification Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Diversification Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className={`text-2xl font-bold ${getDiversificationScore(herfindahlIndex).color}`}>
                {getDiversificationScore(herfindahlIndex).score}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              HHI: {herfindahlIndex.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="text-2xl font-bold">{sectorData.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active sectors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Largest Sector</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-2xl font-bold">
                {sectorData.length > 0 ? sectorData[0].percentage.toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sectorData.length > 0 ? sectorData[0].sector : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error loading sector data</strong>
            <br />
            {error}
            <br />
            <Button 
              variant="link" 
              className="h-auto p-0 text-red-800 dark:text-red-400" 
              onClick={loadMockData}
            >
              Try demo data instead →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin mr-2" />
            <span>Analyzing sector allocation...</span>
          </CardContent>
        </Card>
      )}

      {/* Sector Breakdown */}
      {!isLoading && sectorData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sector Breakdown</CardTitle>
            <CardDescription>
              Portfolio allocation across {sectorData.length} sectors (Total: {formatCurrency(totalValue)})
{showMockData && ' - Demo Data'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sectorData.map((sector, index) => (
                <div key={sector.sector} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${getSectorColor(sector.sector, index)}`} />
                      <div>
                        <span className="font-medium">{sector.sector}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {sector.count} position{sector.count > 1 ? 's' : ''}
                          </Badge>
                          {sector.avgPE && (
                            <Badge variant="outline" className="text-xs">
                              Avg P/E: {sector.avgPE.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(sector.value)}</div>
                      <div className="text-sm text-muted-foreground">
                        {sector.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Progress value={sector.percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Companies: </span>
                    {sector.companies.slice(0, 3).join(', ')}
                    {sector.companies.length > 3 && ` +${sector.companies.length - 3} more`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && sectorData.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sector data available.</p>
            <p className="text-sm mt-2">Make sure you have positions in your Trading212 account.</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={loadMockData}
            >
              <Zap className="h-4 w-4 mr-2" />
              Try Demo Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 