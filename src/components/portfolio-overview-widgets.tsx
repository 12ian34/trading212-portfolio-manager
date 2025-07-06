"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Target,
  Activity,
  Zap,
  Award,
  BarChart3,
  PieChart,
  TrendingUpIcon,
  Clock,
  Star,
  CheckCircle
} from "lucide-react"

interface PortfolioMetrics {
  totalValue: number
  dayChange: number
  dayChangePercent: number
  weekChange: number
  monthChange: number
  yearChange: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  avgWin: number
  avgLoss: number
  diversificationScore: number
  riskScore: number
  performanceGrade: string
  lastUpdated: string
}

interface PortfolioOverviewWidgetsProps {
  metrics?: PortfolioMetrics
  isLoading?: boolean
  onRefresh?: () => void
}

export function PortfolioOverviewWidgets({ 
  metrics, 
  isLoading = false, 
  onRefresh 
}: PortfolioOverviewWidgetsProps) {
  // Demo data for showcase
  const demoMetrics: PortfolioMetrics = {
    totalValue: 12345.67,
    dayChange: 289.12,
    dayChangePercent: 2.34,
    weekChange: 456.78,
    monthChange: 892.34,
    yearChange: 1234.56,
    volatility: 18.5,
    sharpeRatio: 1.24,
    maxDrawdown: -12.3,
    winRate: 65.2,
    avgWin: 8.4,
    avgLoss: -4.2,
    diversificationScore: 78,
    riskScore: 65,
    performanceGrade: "B+",
    lastUpdated: new Date().toISOString()
  }

  const data = metrics || demoMetrics

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getChangeIcon = (value: number) => {
    return value >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
  }

  const getChangeColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  const getRiskLevel = (score: number) => {
    if (score <= 30) return { level: 'Low', color: 'text-green-600', bg: 'bg-green-100' }
    if (score <= 70) return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { level: 'High', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const riskLevel = getRiskLevel(data.riskScore)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Performance Overview */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Performance Overview
            </CardTitle>
            <Award className="h-8 w-8 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{data.performanceGrade}</div>
            <Badge className={`mt-2 ${getGradeColor(data.performanceGrade)}`}>
              Portfolio Grade
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sharpe Ratio</span>
              <span className="font-medium">{data.sharpeRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-medium">{data.winRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Drawdown</span>
              <span className="font-medium text-red-600">{data.maxDrawdown.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Risk Assessment
            </CardTitle>
            <Shield className="h-8 w-8 text-orange-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{riskLevel.level}</div>
            <Badge className={`mt-2 ${riskLevel.bg} ${riskLevel.color}`}>
              Risk Level
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Risk Score</span>
                <span className="font-medium">{data.riskScore}/100</span>
              </div>
              <Progress value={data.riskScore} className="h-2" />
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Volatility</span>
              <span className="font-medium">{data.volatility.toFixed(1)}%</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Diversification</span>
              <span className="font-medium">{data.diversificationScore}/100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Returns */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Period Returns
            </CardTitle>
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Today</span>
              <div className={`flex items-center gap-1 ${getChangeColor(data.dayChangePercent)}`}>
                {getChangeIcon(data.dayChangePercent)}
                <span className="font-medium">
                  {formatPercent(data.dayChangePercent)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Week</span>
              <div className={`flex items-center gap-1 ${getChangeColor(data.weekChange)}`}>
                {getChangeIcon(data.weekChange)}
                <span className="font-medium">
                  {formatCurrency(data.weekChange)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Month</span>
              <div className={`flex items-center gap-1 ${getChangeColor(data.monthChange)}`}>
                {getChangeIcon(data.monthChange)}
                <span className="font-medium">
                  {formatCurrency(data.monthChange)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Year</span>
              <div className={`flex items-center gap-1 ${getChangeColor(data.yearChange)}`}>
                {getChangeIcon(data.yearChange)}
                <span className="font-medium">
                  {formatCurrency(data.yearChange)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Statistics */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trading Statistics
            </CardTitle>
            <Target className="h-8 w-8 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-lg font-bold text-green-700 dark:text-green-400">
                {formatPercent(data.avgWin)}
              </div>
              <div className="text-xs text-muted-foreground">Avg Win</div>
            </div>
            
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-lg font-bold text-red-700 dark:text-red-400">
                {formatPercent(data.avgLoss)}
              </div>
              <div className="text-xs text-muted-foreground">Avg Loss</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-medium">{data.winRate.toFixed(1)}%</span>
            </div>
            <Progress value={data.winRate} className="h-2" />
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Risk/Reward</span>
            <span className="font-medium">
              {(Math.abs(data.avgWin / data.avgLoss)).toFixed(2)}:1
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Health */}
      <Card className="hover:shadow-lg transition-shadow duration-300 md:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Portfolio Health Dashboard
            </CardTitle>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-sm font-medium">Diversification</div>
              <div className="text-xs text-muted-foreground">Well Balanced</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-sm font-medium">Risk Level</div>
              <div className="text-xs text-muted-foreground">Moderate</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUpIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-sm font-medium">Performance</div>
              <div className="text-xs text-muted-foreground">Above Average</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-sm font-medium">Grade</div>
              <div className="text-xs text-muted-foreground">{data.performanceGrade}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="hover:shadow-lg transition-shadow duration-300 md:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Actions
            </CardTitle>
            <Zap className="h-8 w-8 text-yellow-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-12"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <Activity className="h-4 w-4" />
              <span className="text-sm">Refresh Data</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-12"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">View Analysis</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-12"
            >
              <PieChart className="h-4 w-4" />
              <span className="text-sm">Rebalance</span>
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 