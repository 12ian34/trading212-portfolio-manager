"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, AlertTriangle, TrendingUp, MapPin, Globe, Building2, Target, Clock, Zap } from 'lucide-react'
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
  Tooltip, 
  Legend 
} from 'recharts'

interface GeographicData {
  country: string
  region: string
  value: number
  percentage: number
  count: number
  avgPE?: number
  companies: string[]
}

interface RegionData {
  region: string
  value: number
  percentage: number
  count: number
  countries: string[]
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

export function GeographicAllocation() {
  const [geographicData, setGeographicData] = useState<GeographicData[]>([])
  const [regionData, setRegionData] = useState<RegionData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalValue, setTotalValue] = useState(0)
  const [concentrationAlerts, setConcentrationAlerts] = useState<ConcentrationAlert[]>([])
  const [herfindahlIndex, setHerfindahlIndex] = useState(0)
  const [enrichmentStats, setEnrichmentStats] = useState<EnrichmentResponse['summary'] | null>(null)
  const [showMockData, setShowMockData] = useState(false)
  const [viewMode, setViewMode] = useState<'countries' | 'regions'>('regions')

  // Map countries to regions
  const getRegion = (country: string): string => {
    const regionMapping: { [key: string]: string } = {
      'United States': 'North America',
      'Canada': 'North America',
      'Mexico': 'North America',
      'United Kingdom': 'Europe',
      'Germany': 'Europe',
      'France': 'Europe',
      'Netherlands': 'Europe',
      'Sweden': 'Europe',
      'Switzerland': 'Europe',
      'Italy': 'Europe',
      'Spain': 'Europe',
      'Ireland': 'Europe',
      'Denmark': 'Europe',
      'Norway': 'Europe',
      'China': 'Asia-Pacific',
      'Japan': 'Asia-Pacific',
      'South Korea': 'Asia-Pacific',
      'Taiwan': 'Asia-Pacific',
      'Hong Kong': 'Asia-Pacific',
      'Singapore': 'Asia-Pacific',
      'Australia': 'Asia-Pacific',
      'India': 'Asia-Pacific',
      'Israel': 'Middle East',
      'Brazil': 'Latin America',
      'Argentina': 'Latin America',
      'Chile': 'Latin America',
      'South Africa': 'Africa',
      'Unknown': 'Other'
    }
    return regionMapping[country] || 'Other'
  }

  const fetchGeographicData = async () => {
    setIsLoading(true)
    setError(null)
    setShowMockData(false)
    
    try {
      console.log('🌍 Fetching Trading212 positions for geographic analysis...')
      const positions = await trading212Cache.getPositions()
      
      if (positions.length === 0) {
        setGeographicData([])
        setRegionData([])
        setTotalValue(0)
        setEnrichmentStats(null)
        return
      }

      console.log('🔍 Enriching positions with geographic data (Tiingo smart cache)...')
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

      // Calculate geographic allocation
      const countryMap = new Map<string, {
        value: number
        count: number
        companies: string[]
        peRatios: number[]
      }>()

      const regionMap = new Map<string, {
        value: number
        count: number
        countries: Set<string>
        companies: string[]
      }>()

      let total = 0
      
      enrichedPos.forEach((position: EnrichedPosition) => {
        const value = position.currentPrice * position.quantity
        const country = position.country || 'Unknown'
        const region = getRegion(country)
        const company = position.companyName || position.ticker.split('_')[0]
        
        total += value
        
        // Country-level data
        if (!countryMap.has(country)) {
          countryMap.set(country, {
            value: 0,
            count: 0,
            companies: [],
            peRatios: []
          })
        }
        
        const countryInfo = countryMap.get(country)!
        countryInfo.value += value
        countryInfo.count += 1
        countryInfo.companies.push(company)
        
        if (position.peRatio && position.peRatio > 0) {
          countryInfo.peRatios.push(position.peRatio)
        }

        // Region-level data
        if (!regionMap.has(region)) {
          regionMap.set(region, {
            value: 0,
            count: 0,
            countries: new Set(),
            companies: []
          })
        }
        
        const regionInfo = regionMap.get(region)!
        regionInfo.value += value
        regionInfo.count += 1
        regionInfo.countries.add(country)
        regionInfo.companies.push(company)
      })

      setTotalValue(total)

      // Convert to arrays and calculate percentages
      const countries: GeographicData[] = Array.from(countryMap.entries())
        .map(([country, info]) => ({
          country,
          region: getRegion(country),
          value: info.value,
          percentage: total > 0 ? (info.value / total) * 100 : 0,
          count: info.count,
          avgPE: info.peRatios.length > 0 
            ? info.peRatios.reduce((sum, pe) => sum + pe, 0) / info.peRatios.length 
            : undefined,
          companies: info.companies
        }))
        .sort((a, b) => b.value - a.value)

      const regions: RegionData[] = Array.from(regionMap.entries())
        .map(([region, info]) => ({
          region,
          value: info.value,
          percentage: total > 0 ? (info.value / total) * 100 : 0,
          count: info.count,
          countries: Array.from(info.countries),
          companies: info.companies
        }))
        .sort((a, b) => b.value - a.value)

      setGeographicData(countries)
      setRegionData(regions)

      // Calculate concentration metrics (using regions for HHI)
      const hhi = regions.reduce((sum, region) => sum + Math.pow(region.percentage, 2), 0)
      setHerfindahlIndex(hhi)

      // Generate concentration alerts
      const alerts = generateConcentrationAlerts(regions, hhi)
      setConcentrationAlerts(alerts)

      console.log(`✅ Geographic analysis complete: ${countries.length} countries, ${regions.length} regions, HHI: ${hhi.toFixed(1)}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch geographic data')
      console.error('❌ Error fetching geographic data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMockData = () => {
    const mockRegions: RegionData[] = [
      {
        region: 'North America',
        value: 7000,
        percentage: 70.0,
        count: 12,
        countries: ['United States', 'Canada'],
        companies: ['AAPL', 'GOOG', 'MSFT', 'TSLA', 'AMD', 'NVDA', 'META', 'NFLX', 'COIN', 'PLTR', 'V', 'IBM']
      },
      {
        region: 'Europe',
        value: 1500,
        percentage: 15.0,
        count: 4,
        countries: ['Netherlands', 'United Kingdom', 'Germany'],
        companies: ['ASML', 'Unknown', 'Unknown', 'Unknown']
      },
      {
        region: 'Asia-Pacific',
        value: 1200,
        percentage: 12.0,
        count: 3,
        countries: ['Taiwan', 'China', 'Japan'],
        companies: ['TSM', 'TCEHY', 'Unknown']
      },
      {
        region: 'Other',
        value: 300,
        percentage: 3.0,
        count: 2,
        countries: ['Unknown'],
        companies: ['Unknown', 'Unknown']
      }
    ]

    const mockCountries: GeographicData[] = [
      {
        country: 'United States',
        region: 'North America',
        value: 6500,
        percentage: 65.0,
        count: 10,
        avgPE: 26.3,
        companies: ['AAPL', 'GOOG', 'MSFT', 'TSLA', 'AMD', 'NVDA', 'META', 'NFLX', 'COIN', 'PLTR']
      },
      {
        country: 'Taiwan',
        region: 'Asia-Pacific',
        value: 800,
        percentage: 8.0,
        count: 1,
        avgPE: 15.2,
        companies: ['TSM']
      },
      {
        country: 'Canada',
        region: 'North America',
        value: 500,
        percentage: 5.0,
        count: 2,
        avgPE: 22.1,
        companies: ['Unknown', 'Unknown']
      },
      {
        country: 'Netherlands',
        region: 'Europe',
        value: 800,
        percentage: 8.0,
        count: 1,
        avgPE: 31.5,
        companies: ['ASML']
      }
    ]

    setRegionData(mockRegions)
    setGeographicData(mockCountries)
    setTotalValue(10000)
    setShowMockData(true)
    setHerfindahlIndex(5200) // High concentration
    setConcentrationAlerts([
      {
        level: 'high',
        message: 'High Geographic Concentration Risk',
        recommendation: 'Consider diversifying beyond North America (70% allocation). Target allocation below 60% for any single region.'
      }
    ])
  }

  const generateConcentrationAlerts = (regions: RegionData[], hhi: number): ConcentrationAlert[] => {
    const alerts: ConcentrationAlert[] = []

    // Check for high regional concentration
    regions.forEach(region => {
      if (region.percentage > 60) {
        alerts.push({
          level: 'high',
          message: `High ${region.region} Concentration`,
          recommendation: `Consider reducing ${region.region} allocation from ${region.percentage.toFixed(1)}% to below 60% for better geographic diversification.`
        })
      } else if (region.percentage > 40) {
        alerts.push({
          level: 'medium',
          message: `Moderate ${region.region} Concentration`,
          recommendation: `Monitor ${region.region} allocation (${region.percentage.toFixed(1)}%). Consider diversifying if it exceeds 60%.`
        })
      }
    })

    // Check HHI-based concentration
    if (hhi > 3000) {
      alerts.push({
        level: 'high',
        message: 'Poor Geographic Diversification',
        recommendation: 'Portfolio is highly concentrated geographically. Consider adding positions from underrepresented regions.'
      })
    } else if (hhi > 2000) {
      alerts.push({
        level: 'medium',
        message: 'Moderate Geographic Concentration',
        recommendation: 'Good geographic spread but room for improvement. Consider minor adjustments to regional allocation.'
      })
    }

    return alerts
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getRegionColor = (region: string, index: number) => {
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

  const getCountryColor = (country: string, index: number) => {
    const colors = [
      'bg-blue-400',
      'bg-green-400', 
      'bg-yellow-400',
      'bg-purple-400',
      'bg-red-400',
      'bg-indigo-400',
      'bg-pink-400',
      'bg-teal-400'
    ]
    return colors[index % colors.length]
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

  // Chart colors
  const CHART_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'
  ]

  // Custom tooltip for charts
  interface TooltipData {
    value: number
    payload: {
      percentage: number
      count?: number
    }
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipData[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            <span className="font-medium">Value: </span>
            {formatCurrency(data.value)}
          </p>
          <p className="text-sm">
            <span className="font-medium">Percentage: </span>
            {data.payload.percentage?.toFixed(1)}%
          </p>
          {data.payload.count && (
            <p className="text-sm">
              <span className="font-medium">Positions: </span>
              {data.payload.count}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Prepare chart data
  const regionChartData = regionData.map((region, index) => ({
    ...region,
    fill: CHART_COLORS[index % CHART_COLORS.length]
  }))

  const countryChartData = geographicData.map((country, index) => ({
    ...country,
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
                <Globe className="h-5 w-5" />
                Geographic Allocation Analysis
              </CardTitle>
              <CardDescription>
                Portfolio diversification across countries and regions
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
                onClick={fetchGeographicData}
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
          variant={viewMode === 'regions' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('regions')}
        >
          <Globe className="h-4 w-4 mr-2" />
          Regions
        </Button>
        <Button
          variant={viewMode === 'countries' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('countries')}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Countries
        </Button>
      </div>

      {/* Mock Data Notice */}
      {showMockData && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-400">
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode Active</strong>
            <br />
            Showing example geographic allocation data. Click &quot;Refresh&quot; to try loading your real portfolio data.
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
            <CardTitle className="text-sm font-medium">Total Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="text-2xl font-bold">{regionData.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active regions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="text-2xl font-bold">{geographicData.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active countries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Largest Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="text-2xl font-bold">
                {regionData.length > 0 ? regionData[0].percentage.toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {regionData.length > 0 ? regionData[0].region : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error loading geographic data</strong>
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
            <span>Analyzing geographic allocation...</span>
          </CardContent>
        </Card>
      )}

      {/* Regional/Country Breakdown with Charts */}
      {!isLoading && ((viewMode === 'regions' && regionData.length > 0) || (viewMode === 'countries' && geographicData.length > 0)) && (
        <Tabs defaultValue="table" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {viewMode === 'regions' ? 'Regional Breakdown' : 'Country Breakdown'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Portfolio allocation across {viewMode === 'regions' ? regionData.length : geographicData.length} {viewMode} (Total: {formatCurrency(totalValue)})
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
                  {(viewMode === 'regions' ? regionData : geographicData).map((item, index) => (
                    <div key={viewMode === 'regions' ? (item as RegionData).region : (item as GeographicData).country} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${viewMode === 'regions' ? getRegionColor((item as RegionData).region, index) : getCountryColor((item as GeographicData).country, index)}`} />
                          <div>
                            <span className="font-medium">
                              {viewMode === 'regions' ? (item as RegionData).region : (item as GeographicData).country}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {viewMode === 'regions' ? (item as RegionData).count : (item as GeographicData).count} position{(viewMode === 'regions' ? (item as RegionData).count : (item as GeographicData).count) > 1 ? 's' : ''}
                              </Badge>
                              {viewMode === 'regions' && (
                                <Badge variant="outline" className="text-xs">
                                  {(item as RegionData).countries.length} countr{(item as RegionData).countries.length > 1 ? 'ies' : 'y'}
                                </Badge>
                              )}
                              {viewMode === 'countries' && (item as GeographicData).avgPE && (
                                <Badge variant="outline" className="text-xs">
                                  Avg P/E: {(item as GeographicData).avgPE!.toFixed(1)}
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
                        {viewMode === 'regions' ? (
                          <>
                            <span className="font-medium">Countries: </span>
                            {(item as RegionData).countries.slice(0, 3).join(', ')}
                            {(item as RegionData).countries.length > 3 && ` +${(item as RegionData).countries.length - 3} more`}
                          </>
                        ) : (
                          <>
                            <span className="font-medium">Companies: </span>
                            {(item as GeographicData).companies.slice(0, 3).join(', ')}
                            {(item as GeographicData).companies.length > 3 && ` +${(item as GeographicData).companies.length - 3} more`}
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
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={viewMode === 'regions' ? regionChartData : countryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={140}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ percentage }) => `${percentage.toFixed(1)}%`}
                        labelLine={false}
                      >
                        {(viewMode === 'regions' ? regionChartData : countryChartData).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(viewMode === 'regions' ? regionChartData : countryChartData).map((item) => (
                    <div key={viewMode === 'regions' ? (item as RegionData & { fill: string }).region : (item as GeographicData & { fill: string }).country} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="truncate">
                        {viewMode === 'regions' ? (item as RegionData & { fill: string }).region : (item as GeographicData & { fill: string }).country}
                      </span>
                      <span className="text-muted-foreground">({item.percentage.toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bar">
            <Card>
              <CardContent className="pt-6">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={viewMode === 'regions' ? regionChartData : countryChartData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey={viewMode === 'regions' ? 'region' : 'country'}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        fill="#3b82f6" 
                        name="Portfolio Value"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {viewMode === 'regions' ? 'Regional' : 'Country'} allocation by portfolio value - hover over bars for details
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!isLoading && !error && regionData.length === 0 && geographicData.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No geographic data available.</p>
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