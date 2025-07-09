'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CloudOff, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Database,
  Zap,
  Settings,
  Shield,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { apiFallbackService, type FallbackResult } from '@/lib/api-fallback-service'
import { useApiStatus } from '@/components/api-enhanced-button'

interface DemoOperation {
  id: string
  name: string
  description: string
  estimatedCalls: number
  status: 'idle' | 'running' | 'success' | 'error'
  result?: FallbackResult<unknown>
  error?: string
}

export function GracefulDegradationDemo() {
  const { status: apiStatus, loading: apiLoading } = useApiStatus()
  const [operations, setOperations] = useState<DemoOperation[]>([
    {
      id: 'portfolio-refresh',
      name: 'Portfolio Refresh',
      description: 'Refresh all portfolio positions with latest data',
      estimatedCalls: 10,
      status: 'idle'
    },
    {
      id: 'sector-analysis',
      name: 'Sector Analysis',
      description: 'Analyze sector allocation across 5 major sectors',
      estimatedCalls: 5,
      status: 'idle'
    },
    {
      id: 'bulk-enrichment',
      name: 'Bulk Enrichment',
      description: 'Enrich 25 positions with fundamental data',
      estimatedCalls: 25,
      status: 'idle'
    },
    {
      id: 'risk-assessment',
      name: 'Risk Assessment',
      description: 'Calculate portfolio risk metrics',
      estimatedCalls: 15,
      status: 'idle'
    }
  ])

  const [fallbackStatus, setFallbackStatus] = useState<{active: boolean; reasons: string[]}>({
    active: false,
    reasons: []
  })

  const [globalLoading, setGlobalLoading] = useState(false)

  // Check fallback status periodically
  useEffect(() => {
    const checkFallbackStatus = async () => {
      try {
        const status = await apiFallbackService.isFallbackActive()
        setFallbackStatus(status)
      } catch (error) {
        console.error('Failed to check fallback status:', error)
      }
    }

    checkFallbackStatus()
    const interval = setInterval(checkFallbackStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const simulateOperation = async (operation: DemoOperation) => {
    setOperations(prev => prev.map(op => 
      op.id === operation.id 
        ? { ...op, status: 'running' as const, result: undefined, error: undefined }
        : op
    ))

    try {
      const result = await apiFallbackService.executeWithFallback(
        operation.name,
        operation.estimatedCalls,
        async () => {
          // Simulate primary API call
          await new Promise(resolve => setTimeout(resolve, 2000))
          return { 
            data: `Fresh data from API for ${operation.name}`,
            timestamp: new Date().toISOString()
          }
        },
        async () => {
          // Simulate cache fallback
          await new Promise(resolve => setTimeout(resolve, 500))
          return { 
            data: `Cached data for ${operation.name}`,
            timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
          }
        },
        {
          enableCacheFallback: true,
          maxRetries: 2,
          retryDelay: 1000
        }
      )

      setOperations(prev => prev.map(op => 
        op.id === operation.id 
          ? { ...op, status: 'success' as const, result }
          : op
      ))

    } catch (error) {
      setOperations(prev => prev.map(op => 
        op.id === operation.id 
          ? { 
              ...op, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          : op
      ))
    }
  }

  const runAllOperations = async () => {
    setGlobalLoading(true)
    
    // Run operations sequentially to show different fallback scenarios
    for (const operation of operations) {
      await simulateOperation(operation)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    setGlobalLoading(false)
  }

  const resetAllOperations = () => {
    setOperations(prev => prev.map(op => ({
      ...op,
      status: 'idle' as const,
      result: undefined,
      error: undefined
    })))
  }

  const clearCaches = async () => {
    try {
      await apiFallbackService.clearAllCaches()
      alert('All caches cleared successfully!')
    } catch (error) {
      alert('Failed to clear caches: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const getStatusIcon = (status: DemoOperation['status']) => {
    switch (status) {
      case 'idle':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
  }

  const getProviderBadge = (provider: string, fallbackApplied?: boolean) => {
    const colors = {
      alphavantage: 'bg-blue-100 text-blue-800',
      tiingo: 'bg-green-100 text-green-800',
      cache: 'bg-yellow-100 text-yellow-800',
      demo: 'bg-purple-100 text-purple-800'
    }

    return (
      <Badge 
        variant="outline" 
        className={`${colors[provider as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}
      >
        {fallbackApplied && <ArrowRight className="h-3 w-3 mr-1" />}
        {provider.charAt(0).toUpperCase() + provider.slice(1)}
      </Badge>
    )
  }

  const renderOperationResult = (operation: DemoOperation) => {
    if (operation.status === 'idle') {
      return (
        <div className="text-sm text-muted-foreground">
          Ready to run • {operation.estimatedCalls} API calls needed
        </div>
      )
    }

    if (operation.status === 'running') {
      return (
        <div className="text-sm text-blue-600">
          <Loader2 className="h-3 w-3 inline mr-1 animate-spin" />
          Checking API limits and executing...
        </div>
      )
    }

    if (operation.status === 'error') {
      return (
        <Alert className="mt-2 border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-700">
            {operation.error}
          </AlertDescription>
        </Alert>
      )
    }

    if (operation.status === 'success' && operation.result) {
      const result = operation.result
      return (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            {getProviderBadge(result.provider, result.fallbackApplied)}
            {result.isStale && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                <Clock className="h-3 w-3 mr-1" />
                Stale Data
              </Badge>
            )}
          </div>
          
          {result.userMessage && (
            <div className="text-sm text-muted-foreground">
              {result.userMessage}
            </div>
          )}
          
          {result.degradedFeatures && result.degradedFeatures.length > 0 && (
            <div className="text-xs text-orange-600">
              ⚠️ Degraded: {result.degradedFeatures.join(', ')}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Graceful Degradation Demo
        </CardTitle>
        <CardDescription>
          Demonstrates how the system handles API limits with automatic fallbacks, 
          provider switching, and cache usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Global Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <h3 className="font-medium">API Status</h3>
            </div>
            {apiLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : apiStatus ? (
              <div className="space-y-1">
                {apiStatus.providers.map(provider => (
                  <div key={provider.provider} className="flex items-center justify-between text-sm">
                    <span>{provider.provider}</span>
                    <Badge variant={provider.canMakeRequest ? 'default' : 'destructive'}>
                      {provider.canMakeRequest ? 'Available' : 'Limited'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-red-500">Status unavailable</div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-green-500" />
              <h3 className="font-medium">Fallback Status</h3>
            </div>
            <div className="space-y-1">
              <Badge variant={fallbackStatus.active ? 'destructive' : 'default'}>
                {fallbackStatus.active ? 'Active' : 'Inactive'}
              </Badge>
              {fallbackStatus.reasons.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {fallbackStatus.reasons.join(', ')}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-purple-500" />
              <h3 className="font-medium">Controls</h3>
            </div>
            <div className="space-y-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={clearCaches}
                className="w-full"
              >
                Clear Caches
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={resetAllOperations}
                className="w-full"
              >
                Reset Demo
              </Button>
            </div>
          </Card>
        </div>

        {/* Operation Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={runAllOperations}
            disabled={globalLoading}
            className="flex-1"
          >
            {globalLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Operations...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run All Operations
              </>
            )}
          </Button>
        </div>

        {/* Operations List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operations.map(operation => (
            <Card key={operation.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{operation.name}</h3>
                {getStatusIcon(operation.status)}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {operation.description}
              </p>
              
              {renderOperationResult(operation)}
              
              <div className="mt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => simulateOperation(operation)}
                  disabled={operation.status === 'running' || globalLoading}
                  className="w-full"
                >
                  {operation.status === 'running' ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  {operation.status === 'running' ? 'Running...' : 'Run Operation'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <Card className="p-4 bg-muted/50">
          <h3 className="font-medium mb-3">How Graceful Degradation Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span><strong>Provider Switching:</strong> Automatically switches from Alpha Vantage → Tiingo when limits are reached</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-yellow-500" />
                <span><strong>Cache Fallback:</strong> Uses cached data when all APIs are limited</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <span><strong>Retry Logic:</strong> Implements exponential backoff for transient failures</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span><strong>Degraded Features:</strong> Clearly indicates when data is stale or limited</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span><strong>User Messages:</strong> Provides clear explanations of what&apos;s happening</span>
              </div>
              <div className="flex items-center gap-2">
                <CloudOff className="h-4 w-4 text-red-500" />
                <span><strong>Graceful Failures:</strong> System remains functional even when APIs fail</span>
              </div>
            </div>
          </div>
        </Card>
      </CardContent>
    </Card>
  )
} 