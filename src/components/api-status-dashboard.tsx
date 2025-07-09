'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { type ApiLimitsSummary, type ApiLimitStatus } from '@/lib/api-limits-service'

interface ApiStatusDashboardProps {
  showRefreshButton?: boolean
  showTestButtons?: boolean
  compact?: boolean
  className?: string
}

export function ApiStatusDashboard({ 
  showRefreshButton = true, 
  showTestButtons = false,
  compact = false,
  className 
}: ApiStatusDashboardProps) {
  const [status, setStatus] = useState<ApiLimitsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/api-limits/status')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
        setLastUpdate(new Date())
      } else {
        setError(data.error || 'Failed to fetch API status')
      }
    } catch (err) {
      setError('Network error fetching API status')
      console.error('API status fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (provider: ApiLimitStatus) => {
    if (!provider.canMakeRequest) {
      return <XCircle className="h-4 w-4 text-red-500" />
    } else if (provider.warning) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusColor = (provider: ApiLimitStatus) => {
    if (!provider.canMakeRequest) return 'destructive'
    if (provider.warning) return 'secondary'
    return 'default'
  }

  const calculateUsagePercentage = (remaining: number, total: number): number => {
    if (total === 0 || !isFinite(remaining) || !isFinite(total)) return 0
    const used = Math.max(0, total - remaining)
    return Math.min(100, (used / total) * 100)
  }

  const formatResetTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Now'
    
    const diffMinutes = Math.ceil(diffMs / (1000 * 60))
    if (diffMinutes < 60) return `${diffMinutes}m`
    
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
    if (diffHours < 24) return `${diffHours}h`
    
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return `${diffDays}d`
  }

  const simulateApiCall = async (provider: string, count: number = 1) => {
    try {
      await fetch('/api/api-limits/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate', provider, count })
      })
      fetchStatus() // Refresh status after simulation
    } catch (err) {
      console.error('Failed to simulate API call:', err)
    }
  }

  const resetUsage = async (provider?: string) => {
    try {
      await fetch('/api/api-limits/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', provider })
      })
      fetchStatus() // Refresh status after reset
    } catch (err) {
      console.error('Failed to reset usage:', err)
    }
  }

  if (loading && !status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            API Status Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading API status...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            API Status Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          {showRefreshButton && (
            <Button onClick={fetchStatus} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!status) return null

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                API Status Dashboard
              </CardTitle>
              <CardDescription>
                Real-time API usage monitoring across all providers
                {lastUpdate && (
                  <span className="ml-2 text-xs">
                    Updated {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>
            {showRefreshButton && (
              <Button 
                onClick={fetchStatus} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Critical Alerts */}
          {status.criticalLimits.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Critical API Limits Reached</div>
                <ul className="text-sm space-y-1">
                  {status.criticalLimits.map((limit, index) => (
                    <li key={index}>• {limit}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          {status.recommendations.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Recommendations</div>
                <ul className="text-sm space-y-1">
                  {status.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Provider Status Cards */}
          <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {status.providers.map((provider) => (
              <Card key={provider.provider} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(provider)}
                      {provider.provider}
                    </CardTitle>
                    <Badge variant={getStatusColor(provider)}>
                      {provider.canMakeRequest ? 'Active' : 'Limited'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Limits Display */}
                  <div className="space-y-3">
                    {/* Per Minute Limit */}
                    {provider.remainingMinute !== null && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Per Minute</span>
                          <span>{provider.remainingMinute} remaining</span>
                        </div>
                        <Progress 
                          value={calculateUsagePercentage(provider.remainingMinute, 5)} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Resets in {formatResetTime(provider.nextResetTime.minute)}
                        </div>
                      </div>
                    )}

                    {/* Per Hour Limit */}
                    {provider.remainingHour !== null && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Per Hour</span>
                          <span>{provider.remainingHour} remaining</span>
                        </div>
                        <Progress 
                          value={calculateUsagePercentage(provider.remainingHour, 50)} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Resets in {formatResetTime(provider.nextResetTime.hour)}
                        </div>
                      </div>
                    )}

                    {/* Per Day Limit */}
                    {provider.remainingDay !== null && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Per Day</span>
                          <span>{provider.remainingDay} remaining</span>
                        </div>
                        <Progress 
                          value={calculateUsagePercentage(
                            provider.remainingDay, 
                            provider.provider === 'Alpha Vantage' ? 25 : 1000
                          )} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Resets in {formatResetTime(provider.nextResetTime.day)}
                        </div>
                      </div>
                    )}

                    {/* Trading212 - No specific limits */}
                    {provider.provider === 'Trading212' && (
                      <div className="text-sm text-muted-foreground">
                        No explicit rate limits documented
                      </div>
                    )}
                  </div>

                  {/* Warning */}
                  {provider.warning && (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        {provider.warning}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Test Buttons (Development Only) */}
                  {showTestButtons && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => simulateApiCall(provider.provider.toLowerCase().replace(' ', ''))}
                        className="text-xs"
                      >
                        Test Call
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => resetUsage(provider.provider.toLowerCase().replace(' ', ''))}
                        className="text-xs"
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Stats */}
          {!compact && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {status.providers.filter(p => p.canMakeRequest).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Active APIs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {status.providers.filter(p => !p.canMakeRequest).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Limited APIs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {status.providers.filter(p => p.warning).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      <Clock className="h-5 w-5 mx-auto" />
                    </div>
                    <div className="text-xs text-muted-foreground">Auto-refresh</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showTestButtons && (
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => resetUsage()}
                className="text-xs"
              >
                Reset All Usage
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 