"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, AlertTriangle, TrendingUp, PieChart, BarChart3, Building2, Target, Clock, Zap, Download, FileText } from 'lucide-react'
import { trading212Cache } from '@/lib/trading212-cache'
import { 
  exportSectorAllocationToCSV,
  SectorAllocation as SectorAllocationExport
} from '@/lib/export-utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useApiWarning, ApiActions } from '@/components/api-warning-dialog'
import { ApiEnhancedButton } from '@/components/api-enhanced-button'

import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts'

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
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [chartAnimation, setChartAnimation] = useState(true)
  
  // API warning hook
  const { showWarning, WarningDialog } = useApiWarning()

  const fetchSectorData = useCallback(async () => {
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
  }, [])

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
  }, [fetchSectorData])

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

  // Enhanced chart colors with gradients
  const ENHANCED_CHART_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1',
    '#14b8a6', '#f43f5e', '#a855f7', '#eab308', '#22c55e'
  ]

  // Custom tooltip interface
  interface TooltipData {
    value: number
    payload: {
      percentage: number
      count?: number
    }
  }

  // Enhanced custom tooltip with better styling and more info
  const EnhancedCustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipData[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const sectorInfo = sectorData.find(s => s.sector === label)
      
      return (
        <div className="bg-white dark:bg-gray-900 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl backdrop-blur-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm" 
                style={{ backgroundColor: chartData.find(d => d.sector === label)?.fill }}
              />
              <h3 className="font-bold text-lg">{label}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Portfolio Value</p>
                <p className="font-bold text-lg">{formatCurrency(data.value)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Allocation</p>
                <p className="font-bold text-lg">{data.payload.percentage?.toFixed(1)}%</p>
              </div>
              {sectorInfo?.count && (
                <div>
                  <p className="text-muted-foreground">Positions</p>
                  <p className="font-bold">{sectorInfo.count} stocks</p>
                </div>
              )}
              {sectorInfo?.avgPE && (
                <div>
                  <p className="text-muted-foreground">Avg P/E Ratio</p>
                  <p className="font-bold">{sectorInfo.avgPE.toFixed(1)}</p>
                </div>
              )}
            </div>
            
            {sectorInfo?.companies && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Top Holdings:</p>
                <p className="text-xs font-medium">{sectorInfo.companies.slice(0, 3).join(', ')}</p>
                {sectorInfo.companies.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{sectorInfo.companies.length - 3} more companies</p>
                )}
              </div>
            )}
            
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-muted-foreground">💡 Click to drill down into individual stocks</p>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Handle sector click for drill-down
  const handleSectorClick = (sector: string) => {
    setSelectedSector(selectedSector === sector ? null : sector)
    // Add haptic feedback on supported devices
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  // Handle chart animation toggle
  const toggleAnimation = () => {
    setChartAnimation(!chartAnimation)
  }

  const handleRefreshWithWarning = async () => {
    // Get positions from cache to estimate API calls
    const positions = await trading212Cache.getPositions()
    
    showWarning(
      ApiActions.analyzeSector(positions.map(p => p.ticker)),
      fetchSectorData,
      () => {
        console.log('User cancelled sector analysis')
      }
    )
  }

  const handleExportSectorCSV = () => {
    const exportData: SectorAllocationExport[] = sectorData.map(sector => ({
      sector: sector.sector,
      value: sector.value,
      percentage: sector.percentage,
      positionCount: sector.count,
      avgPeRatio: sector.avgPE || 0,
      pnl: 0, // Note: P&L calculation would need additional data
      pnlPercent: 0
    }))
    
    exportSectorAllocationToCSV(exportData)
  }

  // Prepare enhanced chart data with gradients and interactions
  const enhancedChartData = sectorData.map((sector, index) => ({
    ...sector,
    fill: ENHANCED_CHART_COLORS[index % ENHANCED_CHART_COLORS.length],
    isSelected: selectedSector === sector.sector,
    opacity: selectedSector ? (selectedSector === sector.sector ? 1 : 0.3) : 1
  }))

  // Prepare chart data
  const chartData = sectorData.map((sector, index) => ({
    ...sector,
    fill: ENHANCED_CHART_COLORS[index % ENHANCED_CHART_COLORS.length]
  }))

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isLoading || sectorData.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportSectorCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    Sector Allocation CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={loadMockData}
                disabled={isLoading}
              >
                <Zap className="h-4 w-4 mr-2" />
                Demo Data
              </Button>
              <ApiEnhancedButton
                apiAction={ApiActions.analyzeSector(sectorData.map(s => s.sector) || [''])}
                onApiAwareClick={handleRefreshWithWarning}
                disabled={isLoading}
                showUsageIndicator={true}
                showRemainingCount={true}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </ApiEnhancedButton>
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
            Showing example sector allocation data. Click &quot;Refresh&quot; to try loading your real portfolio data.
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

      {/* Sector Breakdown with Charts */}
      {!isLoading && sectorData.length > 0 && (
        <Tabs defaultValue="table" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Sector Breakdown</h3>
              <p className="text-sm text-muted-foreground">
                Portfolio allocation across {sectorData.length} sectors (Total: {formatCurrency(totalValue)})
                {showMockData && ' - Demo Data'}
              </p>
            </div>
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="pie">Pie Chart</TabsTrigger>
              <TabsTrigger value="bar">Bar Chart</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="table">
            <Card>
              <CardContent className="pt-6">
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
          </TabsContent>

          <TabsContent value="pie">
            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Sector Distribution</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedSector ? `Focused on ${selectedSector}` : 'Interactive pie chart'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAnimation}
                      className="text-xs"
                    >
                      {chartAnimation ? '⏸️' : '▶️'} Animation
                    </Button>
                    {selectedSector && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSector(null)}
                        className="text-xs"
                      >
                        ✖️ Clear
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="h-[500px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <defs>
                        {enhancedChartData.map((entry, index) => (
                          <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={entry.fill} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={entry.fill} stopOpacity={0.6} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={enhancedChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={180}
                        paddingAngle={3}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={chartAnimation ? 1500 : 0}
                        animationEasing="ease-out"
                        label={({ sector, percentage, isSelected }) => 
                          isSelected || !selectedSector ? `${sector}: ${percentage.toFixed(1)}%` : ''
                        }
                        labelLine={false}
                        onClick={(data) => handleSectorClick(data.sector)}
                        onMouseEnter={(data) => {
                          // Add subtle hover effect
                          const element = document.querySelector(`[data-sector="${data.sector}"]`) as HTMLElement
                          if (element) {
                            element.style.filter = 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                          }
                        }}
                        onMouseLeave={(data) => {
                          const element = document.querySelector(`[data-sector="${data.sector}"]`) as HTMLElement
                          if (element) {
                            element.style.filter = 'none'
                          }
                        }}
                      >
                        {enhancedChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#gradient-${index})`}
                            stroke={entry.isSelected ? '#fff' : 'none'}
                            strokeWidth={entry.isSelected ? 3 : 0}
                            style={{
                              opacity: entry.opacity,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            data-sector={entry.sector}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<EnhancedCustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        onClick={(entry) => entry.value && handleSectorClick(entry.value)}
                        iconType="circle"
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  
                  {selectedSector && (
                    <div className="absolute top-4 right-4 bg-white dark:bg-gray-900 rounded-lg border shadow-lg p-3 max-w-xs">
                      <h4 className="font-semibold text-sm mb-2">🔍 {selectedSector} Details</h4>
                      <div className="space-y-1 text-xs">
                        {(() => {
                          const sector = sectorData.find(s => s.sector === selectedSector)
                          return sector ? (
                            <>
                              <p><strong>Value:</strong> {formatCurrency(sector.value)}</p>
                              <p><strong>Allocation:</strong> {sector.percentage.toFixed(1)}%</p>
                              <p><strong>Positions:</strong> {sector.count} stocks</p>
                              {sector.avgPE && <p><strong>Avg P/E:</strong> {sector.avgPE.toFixed(1)}</p>}
                              <div className="pt-2 border-t">
                                <p className="font-medium">Companies:</p>
                                <p className="text-muted-foreground">{sector.companies.join(', ')}</p>
                              </div>
                            </>
                          ) : null
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {enhancedChartData.map((sector) => (
                    <button
                      key={sector.sector}
                      onClick={() => handleSectorClick(sector.sector)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-300 ${
                        sector.isSelected 
                          ? 'bg-primary/10 border-primary shadow-md scale-105' 
                          : 'hover:bg-muted border-border hover:shadow-sm'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm flex-shrink-0" 
                        style={{ backgroundColor: sector.fill }}
                      />
                      <div className="text-left min-w-0">
                        <p className="font-medium text-sm truncate">{sector.sector}</p>
                        <p className="text-xs text-muted-foreground">
                          {sector.percentage.toFixed(1)}% • {sector.count} stocks
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bar">
            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Sector Comparison</h4>
                    <p className="text-sm text-muted-foreground">Portfolio value by sector</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAnimation}
                    className="text-xs"
                  >
                    {chartAnimation ? '⏸️' : '▶️'} Animation
                  </Button>
                </div>
                
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={enhancedChartData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <defs>
                        {enhancedChartData.map((entry, index) => (
                          <linearGradient key={index} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={entry.fill} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={entry.fill} stopOpacity={0.6} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="sector" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<EnhancedCustomTooltip />} />
                                             <Bar 
                         dataKey="value" 
                         name="Portfolio Value"
                         radius={[8, 8, 0, 0]}
                         animationDuration={chartAnimation ? 1500 : 0}
                         animationEasing="ease-out"
                       >
                        {enhancedChartData.map((entry, index) => (
                          <Cell 
                            key={`bar-cell-${index}`} 
                            fill={`url(#barGradient-${index})`}
                            stroke={entry.isSelected ? '#fff' : 'none'}
                            strokeWidth={entry.isSelected ? 2 : 0}
                            style={{
                              opacity: entry.opacity,
                              transition: 'all 0.3s ease'
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    💡 Click on bars to highlight sectors • Hover for detailed information
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
      {WarningDialog}
    </div>
  )
} 