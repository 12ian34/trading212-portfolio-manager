"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, AlertTriangle, TrendingUp, Building, Landmark, Target, Clock, Zap, BarChart3 } from 'lucide-react'
import { trading212Cache } from '@/lib/trading212-cache'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Tooltip 
} from 'recharts'
import { useApiWarning, ApiActions } from '@/components/api-warning-dialog'

interface ExchangeData {
  exchange: string
  country: string
  marketType: 'Major' | 'Regional' | 'Emerging' | 'Other'
  value: number
  percentage: number
  count: number
  avgPE?: number
  companies: string[]
  tradingHours: string
}

interface MarketTypeData {
  marketType: 'Major' | 'Regional' | 'Emerging' | 'Other'
  value: number
  percentage: number
  count: number
  exchanges: string[]
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
  exchange?: string
  country?: string
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

export function ExchangeAllocation() {
  const [exchangeData, setExchangeData] = useState<ExchangeData[]>([])
  const [marketTypeData, setMarketTypeData] = useState<MarketTypeData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalValue, setTotalValue] = useState(0)
  const [concentrationAlerts, setConcentrationAlerts] = useState<ConcentrationAlert[]>([])
  const [herfindahlIndex, setHerfindahlIndex] = useState(0)
  const [enrichmentStats, setEnrichmentStats] = useState<EnrichmentResponse['summary'] | null>(null)
  const [showMockData, setShowMockData] = useState(false)
  const [viewMode, setViewMode] = useState<'exchanges' | 'markets'>('exchanges')
  
  // API warning hook
  const { showWarning, WarningDialog } = useApiWarning()

  // Get exchange information and classification
  const getExchangeInfo = (exchange: string, country: string) => {
    const exchangeMapping: { [key: string]: { 
      name: string
      country: string
      marketType: 'Major' | 'Regional' | 'Emerging' | 'Other'
      tradingHours: string
    } } = {
      'NASDAQ': {
        name: 'NASDAQ',
        country: 'United States',
        marketType: 'Major',
        tradingHours: '09:30-16:00 EST'
      },
      'NYSE': {
        name: 'New York Stock Exchange',
        country: 'United States',
        marketType: 'Major',
        tradingHours: '09:30-16:00 EST'
      },
      'LSE': {
        name: 'London Stock Exchange',
        country: 'United Kingdom',
        marketType: 'Major',
        tradingHours: '08:00-16:30 GMT'
      },
      'TSE': {
        name: 'Tokyo Stock Exchange',
        country: 'Japan',
        marketType: 'Major',
        tradingHours: '09:00-15:00 JST'
      },
      'HKEX': {
        name: 'Hong Kong Stock Exchange',
        country: 'Hong Kong',
        marketType: 'Major',
        tradingHours: '09:30-16:00 HKT'
      },
      'EURONEXT': {
        name: 'Euronext',
        country: 'Europe',
        marketType: 'Major',
        tradingHours: '09:00-17:30 CET'
      },
      'TSX': {
        name: 'Toronto Stock Exchange',
        country: 'Canada',
        marketType: 'Regional',
        tradingHours: '09:30-16:00 EST'
      },
      'SIX': {
        name: 'SIX Swiss Exchange',
        country: 'Switzerland',
        marketType: 'Regional',
        tradingHours: '09:00-17:30 CET'
      },
      'ASX': {
        name: 'Australian Securities Exchange',
        country: 'Australia',
        marketType: 'Regional',
        tradingHours: '10:00-16:00 AEST'
      },
      'SSE': {
        name: 'Shanghai Stock Exchange',
        country: 'China',
        marketType: 'Emerging',
        tradingHours: '09:30-15:00 CST'
      },
      'SZSE': {
        name: 'Shenzhen Stock Exchange',
        country: 'China',
        marketType: 'Emerging',
        tradingHours: '09:30-15:00 CST'
      },
      'Unknown': {
        name: 'Unknown Exchange',
        country: country || 'Unknown',
        marketType: 'Other',
        tradingHours: 'Unknown'
      }
    }

    // Try to match the exchange, fallback to Unknown
    const normalizedExchange = exchange?.toUpperCase()
    
    // Check for common variations
    if (normalizedExchange?.includes('NASDAQ')) return exchangeMapping['NASDAQ']
    if (normalizedExchange?.includes('NYSE')) return exchangeMapping['NYSE']
    if (normalizedExchange?.includes('LSE') || normalizedExchange?.includes('LONDON')) return exchangeMapping['LSE']
    
    return exchangeMapping[normalizedExchange] || {
      name: exchange || 'Unknown',
      country: country || 'Unknown',
      marketType: 'Other' as const,
      tradingHours: 'Unknown'
    }
  }

  const fetchExchangeData = async () => {
    setIsLoading(true)
    setError(null)
    setShowMockData(false)
    
    try {
      console.log('🏛️ Fetching Trading212 positions for exchange analysis...')
      const positions = await trading212Cache.getPositions()
      
      if (positions.length === 0) {
        setExchangeData([])
        setMarketTypeData([])
        setTotalValue(0)
        setEnrichmentStats(null)
        return
      }

      console.log('🔍 Enriching positions with exchange data (Tiingo smart cache)...')
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

      // Calculate exchange allocation
      const exchangeMap = new Map<string, {
        value: number
        count: number
        companies: string[]
        peRatios: number[]
        country: string
        marketType: 'Major' | 'Regional' | 'Emerging' | 'Other'
        tradingHours: string
      }>()

      const marketTypeMap = new Map<string, {
        value: number
        count: number
        exchanges: Set<string>
        companies: string[]
      }>()

      let total = 0
      
      enrichedPos.forEach((position: EnrichedPosition) => {
        const value = position.currentPrice * position.quantity
        const exchangeInfo = getExchangeInfo(position.exchange || '', position.country || '')
        const company = position.companyName || position.ticker.split('_')[0]
        
        total += value
        
        // Exchange-level data
        if (!exchangeMap.has(exchangeInfo.name)) {
          exchangeMap.set(exchangeInfo.name, {
            value: 0,
            count: 0,
            companies: [],
            peRatios: [],
            country: exchangeInfo.country,
            marketType: exchangeInfo.marketType,
            tradingHours: exchangeInfo.tradingHours
          })
        }
        
        const exchangeEntry = exchangeMap.get(exchangeInfo.name)!
        exchangeEntry.value += value
        exchangeEntry.count += 1
        exchangeEntry.companies.push(company)
        
        if (position.peRatio && position.peRatio > 0) {
          exchangeEntry.peRatios.push(position.peRatio)
        }

        // Market type data
        if (!marketTypeMap.has(exchangeInfo.marketType)) {
          marketTypeMap.set(exchangeInfo.marketType, {
            value: 0,
            count: 0,
            exchanges: new Set(),
            companies: []
          })
        }
        
        const marketEntry = marketTypeMap.get(exchangeInfo.marketType)!
        marketEntry.value += value
        marketEntry.count += 1
        marketEntry.exchanges.add(exchangeInfo.name)
        marketEntry.companies.push(company)
      })

      setTotalValue(total)

      // Convert to arrays and calculate percentages
      const exchanges: ExchangeData[] = Array.from(exchangeMap.entries())
        .map(([exchange, info]) => ({
          exchange,
          country: info.country,
          marketType: info.marketType,
          value: info.value,
          percentage: total > 0 ? (info.value / total) * 100 : 0,
          count: info.count,
          avgPE: info.peRatios.length > 0 
            ? info.peRatios.reduce((sum, pe) => sum + pe, 0) / info.peRatios.length 
            : undefined,
          companies: info.companies,
          tradingHours: info.tradingHours
        }))
        .sort((a, b) => b.value - a.value)

      const marketTypes: MarketTypeData[] = Array.from(marketTypeMap.entries())
        .map(([marketType, info]) => ({
          marketType: marketType as 'Major' | 'Regional' | 'Emerging' | 'Other',
          value: info.value,
          percentage: total > 0 ? (info.value / total) * 100 : 0,
          count: info.count,
          exchanges: Array.from(info.exchanges),
          companies: info.companies
        }))
        .sort((a, b) => b.value - a.value)

      setExchangeData(exchanges)
      setMarketTypeData(marketTypes)

      // Calculate concentration metrics (using exchanges for HHI)
      const hhi = exchanges.reduce((sum, exchange) => sum + Math.pow(exchange.percentage, 2), 0)
      setHerfindahlIndex(hhi)

      // Generate concentration alerts
      const alerts = generateConcentrationAlerts(exchanges, marketTypes, hhi)
      setConcentrationAlerts(alerts)

      console.log(`✅ Exchange analysis complete: ${exchanges.length} exchanges, ${marketTypes.length} market types, HHI: ${hhi.toFixed(1)}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exchange data')
      console.error('❌ Error fetching exchange data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMockData = () => {
    const mockExchanges: ExchangeData[] = [
      {
        exchange: 'NASDAQ',
        country: 'United States',
        marketType: 'Major',
        value: 6000,
        percentage: 60.0,
        count: 8,
        avgPE: 27.5,
        companies: ['AAPL', 'GOOG', 'MSFT', 'TSLA', 'AMD', 'NVDA', 'META', 'NFLX'],
        tradingHours: '09:30-16:00 EST'
      },
      {
        exchange: 'New York Stock Exchange',
        country: 'United States',
        marketType: 'Major',
        value: 2000,
        percentage: 20.0,
        count: 4,
        avgPE: 22.3,
        companies: ['V', 'IBM', 'COIN', 'PLTR'],
        tradingHours: '09:30-16:00 EST'
      },
      {
        exchange: 'Taiwan Stock Exchange',
        country: 'Taiwan',
        marketType: 'Regional',
        value: 1200,
        percentage: 12.0,
        count: 1,
        avgPE: 15.2,
        companies: ['TSM'],
        tradingHours: '09:00-13:30 CST'
      },
      {
        exchange: 'London Stock Exchange',
        country: 'United Kingdom',
        marketType: 'Major',
        value: 800,
        percentage: 8.0,
        count: 2,
        avgPE: 18.7,
        companies: ['Unknown', 'Unknown'],
        tradingHours: '08:00-16:30 GMT'
      }
    ]

    const mockMarketTypes: MarketTypeData[] = [
      {
        marketType: 'Major',
        value: 8800,
        percentage: 88.0,
        count: 14,
        exchanges: ['NASDAQ', 'New York Stock Exchange', 'London Stock Exchange'],
        companies: ['AAPL', 'GOOG', 'MSFT', 'TSLA', 'AMD', 'NVDA', 'META', 'NFLX', 'V', 'IBM', 'COIN', 'PLTR', 'Unknown', 'Unknown']
      },
      {
        marketType: 'Regional',
        value: 1200,
        percentage: 12.0,
        count: 1,
        exchanges: ['Taiwan Stock Exchange'],
        companies: ['TSM']
      }
    ]

    setExchangeData(mockExchanges)
    setMarketTypeData(mockMarketTypes)
    setTotalValue(10000)
    setShowMockData(true)
    setHerfindahlIndex(4400) // High concentration
    setConcentrationAlerts([
      {
        level: 'high',
        message: 'High Exchange Concentration Risk',
        recommendation: 'NASDAQ represents 60% of portfolio value. Consider diversifying across more exchanges to reduce single-market risk.'
      },
      {
        level: 'medium',
        message: 'US Market Concentration',
        recommendation: 'US exchanges (NASDAQ + NYSE) represent 80% of portfolio. Consider international diversification.'
      }
    ])
  }

  const generateConcentrationAlerts = (exchanges: ExchangeData[], marketTypes: MarketTypeData[], hhi: number): ConcentrationAlert[] => {
    const alerts: ConcentrationAlert[] = []

    // Check for high exchange concentration
    exchanges.forEach(exchange => {
      if (exchange.percentage > 50) {
        alerts.push({
          level: 'high',
          message: `High ${exchange.exchange} Concentration`,
          recommendation: `${exchange.exchange} represents ${exchange.percentage.toFixed(1)}% of portfolio value. Consider diversifying across more exchanges to reduce single-market risk.`
        })
      } else if (exchange.percentage > 35) {
        alerts.push({
          level: 'medium',
          message: `Moderate ${exchange.exchange} Concentration`,
          recommendation: `Monitor ${exchange.exchange} allocation (${exchange.percentage.toFixed(1)}%). Consider diversifying if it exceeds 50%.`
        })
      }
    })

    // Check for market type concentration
    const majorMarkets = marketTypes.find(m => m.marketType === 'Major')
    if (majorMarkets && majorMarkets.percentage > 85) {
      alerts.push({
        level: 'medium',
        message: 'High Major Market Concentration',
        recommendation: `Major markets represent ${majorMarkets.percentage.toFixed(1)}% of portfolio. Consider exposure to emerging or regional markets for diversification.`
      })
    }

    // Check country concentration within exchanges
    const countryConcentration = new Map<string, number>()
    exchanges.forEach(exchange => {
      const current = countryConcentration.get(exchange.country) || 0
      countryConcentration.set(exchange.country, current + exchange.percentage)
    })

    countryConcentration.forEach((percentage, country) => {
      if (percentage > 70) {
        alerts.push({
          level: 'high',
          message: `High ${country} Market Exposure`,
          recommendation: `${country} exchanges represent ${percentage.toFixed(1)}% of portfolio. Consider international exchange diversification.`
        })
      }
    })

    // Check HHI-based concentration
    if (hhi > 3000) {
      alerts.push({
        level: 'high',
        message: 'Poor Exchange Diversification',
        recommendation: 'Portfolio is highly concentrated across few exchanges. Consider spreading investments across more markets.'
      })
    } else if (hhi > 2000) {
      alerts.push({
        level: 'medium',
        message: 'Moderate Exchange Concentration',
        recommendation: 'Good exchange spread but room for improvement. Consider minor adjustments to market allocation.'
      })
    }

    return alerts
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getExchangeColor = (exchange: string, index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-yellow-500',
      'bg-purple-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500'
    ]
    return colors[index % colors.length]
  }

  const getMarketTypeColor = (marketType: string) => {
    switch (marketType) {
      case 'Major': return 'bg-blue-500'
      case 'Regional': return 'bg-green-500'
      case 'Emerging': return 'bg-yellow-500'
      case 'Other': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getMarketTypeBadgeColor = (marketType: string) => {
    switch (marketType) {
      case 'Major': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'Regional': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'Emerging': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'Other': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getAlertColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-400'
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'high': return 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400'
    }
  }

  const getAlertIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return <TrendingUp className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      case 'high': return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getDiversificationScore = (hhi: number) => {
    if (hhi < 1500) return { score: 'Excellent', color: 'text-green-600 dark:text-green-400' }
    if (hhi < 2000) return { score: 'Good', color: 'text-blue-600 dark:text-blue-400' }
    if (hhi < 3000) return { score: 'Moderate', color: 'text-yellow-600 dark:text-yellow-400' }
    return { score: 'Poor', color: 'text-red-600 dark:text-red-400' }
  }

  const handleRefreshWithWarning = async () => {
    // Get positions from cache to estimate API calls
    const positions = await trading212Cache.getPositions()
    
    showWarning(
      ApiActions.analyzeSector(positions.map(p => p.ticker)), // Exchange analysis is similar to sector analysis
      fetchExchangeData,
      () => {
        console.log('User cancelled exchange analysis')
      }
    )
  }

  // Chart colors
  const CHART_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'
  ]

  // Chart data
  const chartData = (viewMode === 'exchanges' ? exchangeData : marketTypeData).map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length]
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Exchange & Market Analysis
              </CardTitle>
              <CardDescription>
                Portfolio diversification across stock exchanges and market types
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
                onClick={handleRefreshWithWarning}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'exchanges' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('exchanges')}
        >
          <Landmark className="h-4 w-4 mr-2" />
          Exchanges
        </Button>
        <Button
          variant={viewMode === 'markets' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('markets')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Market Types
        </Button>
      </div>

      {/* Mock Data Notice */}
      {showMockData && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-400">
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode Active</strong>
            <br />
            Showing example exchange allocation data. Click &quot;Refresh&quot; to try loading your real portfolio data.
          </AlertDescription>
        </Alert>
      )}

      {/* Enrichment Status */}
      {enrichmentStats && !showMockData && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Total Exchanges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              <span className="text-2xl font-bold">{exchangeData.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active exchanges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Market Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-2xl font-bold">{marketTypeData.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Different market types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Largest Exchange</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="text-2xl font-bold">
                {exchangeData.length > 0 ? exchangeData[0].percentage.toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {exchangeData.length > 0 ? exchangeData[0].exchange : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error loading exchange data</strong>
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
            <span>Analyzing exchange allocation...</span>
          </CardContent>
        </Card>
      )}

      {/* Exchange/Market Type Breakdown with Charts */}
      {!isLoading && ((viewMode === 'exchanges' && exchangeData.length > 0) || (viewMode === 'markets' && marketTypeData.length > 0)) && (
        <Tabs defaultValue="table" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {viewMode === 'exchanges' ? 'Exchange Breakdown' : 'Market Type Breakdown'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Portfolio allocation across {viewMode === 'exchanges' ? exchangeData.length : marketTypeData.length} {viewMode === 'exchanges' ? 'exchanges' : 'market types'} (Total: {formatCurrency(totalValue)})
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
                  {(viewMode === 'exchanges' ? exchangeData : marketTypeData).map((item, index) => (
                    <div key={viewMode === 'exchanges' ? (item as ExchangeData).exchange : (item as MarketTypeData).marketType} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${viewMode === 'exchanges' ? getExchangeColor((item as ExchangeData).exchange, index) : getMarketTypeColor((item as MarketTypeData).marketType)}`} />
                          <div>
                            <span className="font-medium">
                              {viewMode === 'exchanges' ? (item as ExchangeData).exchange : (item as MarketTypeData).marketType}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {viewMode === 'exchanges' ? (item as ExchangeData).count : (item as MarketTypeData).count} position{(viewMode === 'exchanges' ? (item as ExchangeData).count : (item as MarketTypeData).count) > 1 ? 's' : ''}
                              </Badge>
                              {viewMode === 'exchanges' && (
                                <>
                                  <Badge className={`text-xs ${getMarketTypeBadgeColor((item as ExchangeData).marketType)}`}>
                                    {(item as ExchangeData).marketType}
                                  </Badge>
                                  {(item as ExchangeData).avgPE && (
                                    <Badge variant="outline" className="text-xs">
                                      Avg P/E: {(item as ExchangeData).avgPE!.toFixed(1)}
                                    </Badge>
                                  )}
                                </>
                              )}
                              {viewMode === 'markets' && (
                                <Badge variant="outline" className="text-xs">
                                  {(item as MarketTypeData).exchanges.length} exchange{(item as MarketTypeData).exchanges.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(item.value)}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {viewMode === 'exchanges' ? (
                          <>
                            <div>
                              <span className="font-medium">Country: </span>
                              {(item as ExchangeData).country}
                              <span className="ml-4 font-medium">Trading Hours: </span>
                              {(item as ExchangeData).tradingHours}
                            </div>
                            <div>
                              <span className="font-medium">Companies: </span>
                              {(item as ExchangeData).companies.slice(0, 3).join(', ')}
                              {(item as ExchangeData).companies.length > 3 && ` +${(item as ExchangeData).companies.length - 3} more`}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="font-medium">Exchanges: </span>
                              {(item as MarketTypeData).exchanges.slice(0, 3).join(', ')}
                              {(item as MarketTypeData).exchanges.length > 3 && ` +${(item as MarketTypeData).exchanges.length - 3} more`}
                            </div>
                            <div>
                              <span className="font-medium">Companies: </span>
                              {(item as MarketTypeData).companies.slice(0, 3).join(', ')}
                              {(item as MarketTypeData).companies.length > 3 && ` +${(item as MarketTypeData).companies.length - 3} more`}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pie">
            <Card>
              <CardContent className="pt-6">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={chartData}
                        cx={'50%'}
                        cy={'50%'}
                        labelLine={false}
                        label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bar">
            <Card>
              <CardContent className="pt-6">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey={viewMode === 'exchanges' ? 'exchange' : 'marketType'}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!isLoading && !error && exchangeData.length === 0 && marketTypeData.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No exchange data available.</p>
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