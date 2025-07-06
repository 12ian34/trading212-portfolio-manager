"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, AlertTriangle, Shield, Zap, PieChart, Globe, Building } from 'lucide-react'
import { trading212Cache } from '@/lib/trading212-cache'

interface RiskMetrics {
  overallRiskScore: number
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High'
  sectorRisk: {
    hhi: number
    diversificationScore: string
    maxConcentration: number
    maxSector: string
    alerts: RiskAlert[]
  }
  geographicRisk: {
    hhi: number
    diversificationScore: string
    maxConcentration: number
    maxRegion: string
    alerts: RiskAlert[]
  }
  exchangeRisk: {
    hhi: number
    diversificationScore: string
    maxConcentration: number
    maxExchange: string
    alerts: RiskAlert[]
  }
  recommendations: Recommendation[]
}

interface RiskAlert {
  type: 'sector' | 'geographic' | 'exchange' | 'overall'
  level: 'low' | 'medium' | 'high'
  message: string
  recommendation: string
  priority: number
}

interface Recommendation {
  id: string
  title: string
  description: string
  priority: 'High' | 'Medium' | 'Low'
  action: string
  impact: string
}

interface EnrichedPosition {
  ticker: string
  currentPrice: number
  quantity: number
  sector?: string
  country?: string
  exchange?: string
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

export function RiskAnalysis() {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalValue, setTotalValue] = useState(0)
  const [enrichmentStats, setEnrichmentStats] = useState<EnrichmentResponse['summary'] | null>(null)
  const [showMockData, setShowMockData] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Calculate HHI for any allocation
  const calculateHHI = (allocations: { percentage: number }[]) => {
    return allocations.reduce((sum, item) => sum + Math.pow(item.percentage, 2), 0)
  }

  // Get diversification score from HHI
  const getDiversificationScore = (hhi: number) => {
    if (hhi < 1500) return 'Excellent'
    if (hhi < 2000) return 'Good'
    if (hhi < 3000) return 'Moderate'
    return 'Poor'
  }

  // Map regions for geographic analysis
  const getRegion = (country: string): string => {
    const regionMapping: { [key: string]: string } = {
      'United States': 'North America',
      'Canada': 'North America',
      'United Kingdom': 'Europe',
      'Germany': 'Europe',
      'France': 'Europe',
      'Netherlands': 'Europe',
      'Switzerland': 'Europe',
      'China': 'Asia-Pacific',
      'Japan': 'Asia-Pacific',
      'Taiwan': 'Asia-Pacific',
      'Hong Kong': 'Asia-Pacific',
      'Singapore': 'Asia-Pacific',
      'Unknown': 'Other'
    }
    return regionMapping[country] || 'Other'
  }

  // Calculate overall risk score
  const calculateOverallRiskScore = (sectorHHI: number, geoHHI: number, exchangeHHI: number) => {
    // Weighted average of HHI scores, normalized to 0-100 scale
    const weights = { sector: 0.4, geographic: 0.35, exchange: 0.25 }
    const normalizedScore = (
      (sectorHHI / 10000) * weights.sector +
      (geoHHI / 10000) * weights.geographic +
      (exchangeHHI / 10000) * weights.exchange
    ) * 100
    
    return Math.min(100, Math.max(0, normalizedScore))
  }

  // Get risk level from score
  const getRiskLevel = (score: number): 'Low' | 'Medium' | 'High' | 'Very High' => {
    if (score < 25) return 'Low'
    if (score < 50) return 'Medium'
    if (score < 75) return 'High'
    return 'Very High'
  }

  const fetchRiskData = async () => {
    setIsLoading(true)
    setError(null)
    setShowMockData(false)
    
    try {
      console.log('🛡️ Fetching Trading212 positions for risk analysis...')
      const positions = await trading212Cache.getPositions()
      
      if (positions.length === 0) {
        setRiskMetrics(null)
        setTotalValue(0)
        setEnrichmentStats(null)
        return
      }

      console.log('🔍 Enriching positions with risk data (Tiingo smart cache)...')
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

      // Calculate risk metrics
      const sectorMap = new Map<string, number>()
      const regionMap = new Map<string, number>()
      const exchangeMap = new Map<string, number>()

      let total = 0
      
      enrichedPos.forEach((position: EnrichedPosition) => {
        const value = position.currentPrice * position.quantity
        total += value
        
        // Sector allocation
        const sector = position.sector || 'Unknown'
        sectorMap.set(sector, (sectorMap.get(sector) || 0) + value)
        
        // Geographic allocation
        const region = getRegion(position.country || 'Unknown')
        regionMap.set(region, (regionMap.get(region) || 0) + value)
        
        // Exchange allocation
        const exchange = position.exchange || 'Unknown'
        exchangeMap.set(exchange, (exchangeMap.get(exchange) || 0) + value)
      })

      setTotalValue(total)

      // Calculate percentages and HHI
      const sectorAllocations = Array.from(sectorMap.entries())
        .map(([sector, value]) => ({
          sector,
          value,
          percentage: total > 0 ? (value / total) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)

      const regionAllocations = Array.from(regionMap.entries())
        .map(([region, value]) => ({
          region,
          value,
          percentage: total > 0 ? (value / total) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)

      const exchangeAllocations = Array.from(exchangeMap.entries())
        .map(([exchange, value]) => ({
          exchange,
          value,
          percentage: total > 0 ? (value / total) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)

      // Calculate HHI scores
      const sectorHHI = calculateHHI(sectorAllocations)
      const geoHHI = calculateHHI(regionAllocations)
      const exchangeHHI = calculateHHI(exchangeAllocations)

      // Calculate overall risk score
      const overallScore = calculateOverallRiskScore(sectorHHI, geoHHI, exchangeHHI)

      // Generate alerts and recommendations
      const alerts = generateRiskAlerts(sectorAllocations, regionAllocations, exchangeAllocations)
      const recommendations = generateRecommendations(sectorAllocations, regionAllocations, exchangeAllocations, overallScore)

      const riskData: RiskMetrics = {
        overallRiskScore: overallScore,
        riskLevel: getRiskLevel(overallScore),
        sectorRisk: {
          hhi: sectorHHI,
          diversificationScore: getDiversificationScore(sectorHHI),
          maxConcentration: sectorAllocations.length > 0 ? sectorAllocations[0].percentage : 0,
          maxSector: sectorAllocations.length > 0 ? sectorAllocations[0].sector : 'None',
          alerts: alerts.filter(a => a.type === 'sector')
        },
        geographicRisk: {
          hhi: geoHHI,
          diversificationScore: getDiversificationScore(geoHHI),
          maxConcentration: regionAllocations.length > 0 ? regionAllocations[0].percentage : 0,
          maxRegion: regionAllocations.length > 0 ? regionAllocations[0].region : 'None',
          alerts: alerts.filter(a => a.type === 'geographic')
        },
        exchangeRisk: {
          hhi: exchangeHHI,
          diversificationScore: getDiversificationScore(exchangeHHI),
          maxConcentration: exchangeAllocations.length > 0 ? exchangeAllocations[0].percentage : 0,
          maxExchange: exchangeAllocations.length > 0 ? exchangeAllocations[0].exchange : 'None',
          alerts: alerts.filter(a => a.type === 'exchange')
        },
        recommendations
      }

      setRiskMetrics(riskData)
      console.log(`✅ Risk analysis complete: Overall score: ${overallScore.toFixed(1)}, Risk level: ${riskData.riskLevel}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch risk data')
      console.error('❌ Error fetching risk data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const generateRiskAlerts = (
    sectors: { sector: string; percentage: number }[],
    regions: { region: string; percentage: number }[],
    exchanges: { exchange: string; percentage: number }[]
  ): RiskAlert[] => {
    const alerts: RiskAlert[] = []

    // Sector concentration alerts
    sectors.forEach(item => {
      if (item.percentage > 40) {
        alerts.push({
          type: 'sector',
          level: 'high',
          message: `High ${item.sector} sector concentration (${item.percentage.toFixed(1)}%)`,
          recommendation: `Consider reducing ${item.sector} allocation below 40% for better diversification`,
          priority: 1
        })
      } else if (item.percentage > 25) {
        alerts.push({
          type: 'sector',
          level: 'medium',
          message: `Moderate ${item.sector} sector concentration (${item.percentage.toFixed(1)}%)`,
          recommendation: `Monitor ${item.sector} allocation and consider diversification if it exceeds 40%`,
          priority: 2
        })
      }
    })

    // Geographic concentration alerts
    regions.forEach(item => {
      if (item.percentage > 60) {
        alerts.push({
          type: 'geographic',
          level: 'high',
          message: `High ${item.region} geographic concentration (${item.percentage.toFixed(1)}%)`,
          recommendation: `Consider reducing ${item.region} allocation below 60% for better geographic diversification`,
          priority: 1
        })
      } else if (item.percentage > 40) {
        alerts.push({
          type: 'geographic',
          level: 'medium',
          message: `Moderate ${item.region} geographic concentration (${item.percentage.toFixed(1)}%)`,
          recommendation: `Monitor ${item.region} allocation and consider international diversification`,
          priority: 2
        })
      }
    })

    // Exchange concentration alerts
    exchanges.forEach(item => {
      if (item.percentage > 50) {
        alerts.push({
          type: 'exchange',
          level: 'high',
          message: `High ${item.exchange} exchange concentration (${item.percentage.toFixed(1)}%)`,
          recommendation: `Consider diversifying across more exchanges to reduce single-market risk`,
          priority: 1
        })
      } else if (item.percentage > 35) {
        alerts.push({
          type: 'exchange',
          level: 'medium',
          message: `Moderate ${item.exchange} exchange concentration (${item.percentage.toFixed(1)}%)`,
          recommendation: `Monitor ${item.exchange} allocation and consider cross-exchange diversification`,
          priority: 2
        })
      }
    })

    return alerts.sort((a, b) => a.priority - b.priority)
  }

  const generateRecommendations = (
    sectors: { sector: string; percentage: number }[],
    regions: { region: string; percentage: number }[],
    exchanges: { exchange: string; percentage: number }[],
    overallScore: number
  ): Recommendation[] => {
    const recommendations: Recommendation[] = []

    // Overall risk-based recommendations
    if (overallScore > 70) {
      recommendations.push({
        id: 'high-risk-rebalance',
        title: 'High Risk - Immediate Rebalancing Needed',
        description: 'Your portfolio shows high concentration risk across multiple dimensions',
        priority: 'High',
        action: 'Diversify your largest holdings across sectors, regions, and exchanges',
        impact: 'Significantly reduce portfolio volatility and single-point-of-failure risk'
      })
    }

    // Sector-specific recommendations
    const topSector = sectors[0]
    if (topSector && topSector.percentage > 40) {
      recommendations.push({
        id: 'sector-diversification',
        title: `Reduce ${topSector.sector} Sector Concentration`,
        description: `${topSector.sector} represents ${topSector.percentage.toFixed(1)}% of your portfolio`,
        priority: 'High',
        action: `Consider selling some ${topSector.sector} positions or adding positions in other sectors`,
        impact: 'Reduce sector-specific risk and improve overall portfolio stability'
      })
    }

    // Geographic recommendations
    const topRegion = regions[0]
    if (topRegion && topRegion.percentage > 60) {
      recommendations.push({
        id: 'geographic-diversification',
        title: `Increase International Diversification`,
        description: `${topRegion.region} represents ${topRegion.percentage.toFixed(1)}% of your portfolio`,
        priority: 'Medium',
        action: `Consider adding positions from other regions like Europe, Asia-Pacific, or emerging markets`,
        impact: 'Reduce geographic concentration risk and benefit from global market diversification'
      })
    }

    // Exchange recommendations
    const topExchange = exchanges[0]
    if (topExchange && topExchange.percentage > 50) {
      recommendations.push({
        id: 'exchange-diversification',
        title: `Diversify Across More Exchanges`,
        description: `${topExchange.exchange} represents ${topExchange.percentage.toFixed(1)}% of your portfolio`,
        priority: 'Medium',
        action: `Consider adding positions from other major exchanges like LSE, TSE, or HKEX`,
        impact: 'Reduce single-market risk and benefit from different trading time zones'
      })
    }

    // Diversification recommendations
    if (sectors.length < 5) {
      recommendations.push({
        id: 'increase-sector-count',
        title: 'Increase Sector Diversification',
        description: `Your portfolio only spans ${sectors.length} sectors`,
        priority: 'Medium',
        action: 'Consider adding positions in healthcare, consumer goods, utilities, or other sectors',
        impact: 'Improve portfolio resilience to sector-specific downturns'
      })
    }

    // Low-risk maintenance recommendations
    if (overallScore < 30) {
      recommendations.push({
        id: 'maintain-diversification',
        title: 'Maintain Current Diversification',
        description: 'Your portfolio shows good diversification across multiple dimensions',
        priority: 'Low',
        action: 'Continue monitoring allocation ratios and rebalance periodically',
        impact: 'Maintain current low-risk profile while allowing for growth'
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  const loadMockData = () => {
    const mockRisk: RiskMetrics = {
      overallRiskScore: 65,
      riskLevel: 'High',
      sectorRisk: {
        hhi: 3200,
        diversificationScore: 'Poor',
        maxConcentration: 45,
        maxSector: 'Technology',
        alerts: [
          {
            type: 'sector',
            level: 'high',
            message: 'High Technology sector concentration (45%)',
            recommendation: 'Consider reducing Technology allocation below 40% for better diversification',
            priority: 1
          }
        ]
      },
      geographicRisk: {
        hhi: 2800,
        diversificationScore: 'Moderate',
        maxConcentration: 70,
        maxRegion: 'North America',
        alerts: [
          {
            type: 'geographic',
            level: 'high',
            message: 'High North America geographic concentration (70%)',
            recommendation: 'Consider reducing North America allocation below 60% for better geographic diversification',
            priority: 1
          }
        ]
      },
      exchangeRisk: {
        hhi: 4400,
        diversificationScore: 'Poor',
        maxConcentration: 60,
        maxExchange: 'NASDAQ',
        alerts: [
          {
            type: 'exchange',
            level: 'high',
            message: 'High NASDAQ exchange concentration (60%)',
            recommendation: 'Consider diversifying across more exchanges to reduce single-market risk',
            priority: 1
          }
        ]
      },
      recommendations: [
        {
          id: 'high-risk-rebalance',
          title: 'High Risk - Immediate Rebalancing Needed',
          description: 'Your portfolio shows high concentration risk across multiple dimensions',
          priority: 'High',
          action: 'Diversify your largest holdings across sectors, regions, and exchanges',
          impact: 'Significantly reduce portfolio volatility and single-point-of-failure risk'
        },
        {
          id: 'sector-diversification',
          title: 'Reduce Technology Sector Concentration',
          description: 'Technology represents 45% of your portfolio',
          priority: 'High',
          action: 'Consider selling some Technology positions or adding positions in other sectors',
          impact: 'Reduce sector-specific risk and improve overall portfolio stability'
        },
        {
          id: 'geographic-diversification',
          title: 'Increase International Diversification',
          description: 'North America represents 70% of your portfolio',
          priority: 'Medium',
          action: 'Consider adding positions from other regions like Europe, Asia-Pacific, or emerging markets',
          impact: 'Reduce geographic concentration risk and benefit from global market diversification'
        }
      ]
    }

    setRiskMetrics(mockRisk)
    setTotalValue(10000)
    setShowMockData(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-600 dark:text-green-400'
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400'
      case 'High': return 'text-red-600 dark:text-red-400'
      case 'Very High': return 'text-red-700 dark:text-red-300'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getDiversificationColor = (score: string) => {
    switch (score) {
      case 'Excellent': return 'text-green-600 dark:text-green-400'
      case 'Good': return 'text-blue-600 dark:text-blue-400'
      case 'Moderate': return 'text-yellow-600 dark:text-yellow-400'
      case 'Poor': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getAlertColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-400'
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'high': return 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400'
    }
  }

  const getPriorityColor = (priority: 'High' | 'Medium' | 'Low') => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Portfolio Risk Analysis
              </CardTitle>
              <CardDescription>
                Comprehensive risk assessment and rebalancing recommendations
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
                onClick={fetchRiskData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Analyze Risk
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mock Data Notice */}
      {showMockData && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-400">
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode Active</strong>
            <br />
            Showing example risk analysis data. Click &quot;Analyze Risk&quot; to run analysis on your real portfolio data.
          </AlertDescription>
        </Alert>
      )}

      {/* Enrichment Status */}
      {enrichmentStats && !showMockData && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="text-sm">
              <strong>{enrichmentStats.fromCache + enrichmentStats.freshlyFetched}</strong> of <strong>{enrichmentStats.totalProcessed}</strong> positions analyzed
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

      {/* Overall Risk Score */}
      {riskMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Risk Assessment</CardTitle>
            <CardDescription>
              Portfolio risk score and level (Total: {formatCurrency(totalValue)})
              {showMockData && ' - Demo Data'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {riskMetrics.overallRiskScore.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Risk Score</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getRiskLevelColor(riskMetrics.riskLevel)}`}>
                  {riskMetrics.riskLevel}
                </div>
                <div className="text-sm text-muted-foreground">Risk Level</div>
              </div>
            </div>
            <Progress value={riskMetrics.overallRiskScore} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low Risk</span>
              <span>High Risk</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Breakdown */}
      {riskMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Sector Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Diversification</span>
                  <span className={`font-medium ${getDiversificationColor(riskMetrics.sectorRisk.diversificationScore)}`}>
                    {riskMetrics.sectorRisk.diversificationScore}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Concentration</span>
                  <span className="font-medium">{riskMetrics.sectorRisk.maxConcentration.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Top Sector</span>
                  <span className="font-medium">{riskMetrics.sectorRisk.maxSector}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">HHI</span>
                  <span className="font-medium">{riskMetrics.sectorRisk.hhi.toFixed(0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Geographic Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Diversification</span>
                  <span className={`font-medium ${getDiversificationColor(riskMetrics.geographicRisk.diversificationScore)}`}>
                    {riskMetrics.geographicRisk.diversificationScore}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Concentration</span>
                  <span className="font-medium">{riskMetrics.geographicRisk.maxConcentration.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Top Region</span>
                  <span className="font-medium">{riskMetrics.geographicRisk.maxRegion}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">HHI</span>
                  <span className="font-medium">{riskMetrics.geographicRisk.hhi.toFixed(0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Exchange Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Diversification</span>
                  <span className={`font-medium ${getDiversificationColor(riskMetrics.exchangeRisk.diversificationScore)}`}>
                    {riskMetrics.exchangeRisk.diversificationScore}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Concentration</span>
                  <span className="font-medium">{riskMetrics.exchangeRisk.maxConcentration.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Top Exchange</span>
                  <span className="font-medium">{riskMetrics.exchangeRisk.maxExchange}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">HHI</span>
                  <span className="font-medium">{riskMetrics.exchangeRisk.hhi.toFixed(0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Details Tabs */}
      {riskMetrics && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alerts">Risk Alerts</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Risk Alerts</CardTitle>
                <CardDescription>
                  Concentration risks across your portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {[...riskMetrics.sectorRisk.alerts, ...riskMetrics.geographicRisk.alerts, ...riskMetrics.exchangeRisk.alerts].length > 0 ? (
                  <div className="space-y-3">
                    {[...riskMetrics.sectorRisk.alerts, ...riskMetrics.geographicRisk.alerts, ...riskMetrics.exchangeRisk.alerts].map((alert, index) => (
                      <Alert key={index} className={getAlertColor(alert.level)}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <strong>{alert.message}</strong>
                              <br />
                              <span className="text-sm opacity-90">{alert.recommendation}</span>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {alert.type}
                            </Badge>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No significant concentration risks detected.</p>
                    <p className="text-sm mt-2">Your portfolio appears well-diversified across multiple dimensions.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rebalancing Recommendations</CardTitle>
                <CardDescription>
                  Actionable steps to improve your portfolio risk profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskMetrics.recommendations.map((rec) => (
                    <div key={rec.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">Action: </span>
                          {rec.action}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Impact: </span>
                          {rec.impact}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Error State */}
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error loading risk data</strong>
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
            <span>Analyzing portfolio risk...</span>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && !riskMetrics && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No risk data available.</p>
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