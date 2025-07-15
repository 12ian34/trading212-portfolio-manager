'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Zap, 
  Clock,
  Info
} from 'lucide-react'
import { 
  type ApiLimitStatus,
  type ApiLimitsSummary 
} from '@/lib/api-limits-service'

export interface ApiAction {
  name: string
  description: string
  provider: string
  estimatedCalls: number
  alternativeProvider?: string
  category?: 'enrichment' | 'data-fetch' | 'analysis' | 'export'
}

interface ApiWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: ApiAction
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  showAlternatives?: boolean
}

export function ApiWarningDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
  onCancel,
  showAlternatives = true
}: ApiWarningDialogProps) {
  const [status, setStatus] = useState<ApiLimitsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (open) {
      fetchStatus()
    }
  }, [open])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/api-limits/status')
      const data = await response.json()
      if (data.success) {
        setStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch API status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    try {
      setConfirming(true)
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setConfirming(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const providerStatus = status?.providers.find(p => 
    p.provider.toLowerCase().replace(' ', '') === action.provider.toLowerCase()
  )

  const alternativeStatus = action.alternativeProvider 
    ? status?.providers.find(p => 
        p.provider.toLowerCase().replace(' ', '') === action.alternativeProvider?.toLowerCase()
      )
    : null

  const getRemainingForAction = (provider: ApiLimitStatus | undefined): number => {
    if (!provider) return 0
    
    // Return the most restrictive limit
    const limits = [
      provider.remainingMinute,
      provider.remainingHour,
      provider.remainingDay
    ].filter(limit => limit !== null) as number[]
    
    return Math.min(...limits, Infinity)
  }

  const getWarningLevel = (): 'safe' | 'warning' | 'critical' => {
    if (!providerStatus) return 'critical'
    
    const remaining = getRemainingForAction(providerStatus)
    const ratio = action.estimatedCalls / remaining
    
    if (!providerStatus.canMakeRequest || remaining < action.estimatedCalls) {
      return 'critical'
    } else if (ratio > 0.5 || remaining <= 5) {
      return 'warning'
    } else {
      return 'safe'
    }
  }

  const warningLevel = getWarningLevel()
  const remaining = getRemainingForAction(providerStatus)

  const getWarningIcon = () => {
    switch (warningLevel) {
      case 'safe':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getWarningMessage = (): string => {
    if (!providerStatus) return 'Unable to check API status'
    
    switch (warningLevel) {
      case 'safe':
        return 'Sufficient API calls available'
      case 'warning':
        return `Low API limits: only ${remaining} calls remaining`
      case 'critical':
        if (!providerStatus.canMakeRequest) {
          return `${providerStatus.provider} has reached its rate limits`
        } else {
          return `Insufficient API calls: need ${action.estimatedCalls}, have ${remaining}`
        }
    }
  }

  const canProceed = providerStatus?.canMakeRequest && remaining >= action.estimatedCalls

  const formatProvider = (provider: string): string => {
    return provider.charAt(0).toUpperCase() + provider.slice(1)
  }

  const getCategoryIcon = () => {
    switch (action.category) {
      case 'enrichment':
        return <Zap className="h-4 w-4" />
      case 'data-fetch':
        return <Clock className="h-4 w-4" />
      case 'analysis':
        return <Info className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  const getCategoryColor = () => {
    switch (action.category) {
      case 'enrichment':
        return 'bg-blue-500'
      case 'data-fetch':
        return 'bg-green-500'
      case 'analysis':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Checking API Status...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getWarningIcon()}
            API Usage Warning
          </DialogTitle>
          <DialogDescription>
            This action will consume API calls. Please review the details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${getCategoryColor()}`}>
                {getCategoryIcon()}
              </div>
              <div>
                <h3 className="font-semibold">{action.name}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            </div>
          </div>

          {/* API Cost Breakdown */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              API Usage Details
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Provider:</span>
                <div className="font-medium">{formatProvider(action.provider)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Estimated Calls:</span>
                <div className="font-medium">{action.estimatedCalls}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Available:</span>
                <div className="font-medium">
                  {providerStatus ? remaining : 'Unknown'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">After Action:</span>
                <div className="font-medium">
                  {providerStatus ? Math.max(0, remaining - action.estimatedCalls) : 'Unknown'}
                </div>
              </div>
            </div>

            {/* Usage Progress Bar */}
            {providerStatus && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Current Usage</span>
                  <span>{remaining} remaining</span>
                </div>
                <Progress 
                  value={remaining > 0 ? ((action.estimatedCalls / remaining) * 100) : 100}
                  className="h-2"
                />
              </div>
            )}
          </div>

          {/* Warning Alert */}
          <Alert variant={warningLevel === 'critical' ? 'destructive' : 'default'}>
            {getWarningIcon()}
            <AlertDescription>
              <div className="font-semibold mb-1">
                {warningLevel === 'critical' ? 'Cannot Proceed' : 
                 warningLevel === 'warning' ? 'Proceed with Caution' : 'Ready to Proceed'}
              </div>
              {getWarningMessage()}
            </AlertDescription>
          </Alert>

          {/* Alternative Provider Suggestion */}
          {!canProceed && alternativeStatus && showAlternatives && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Alternative Available</div>
                Consider using {formatProvider(action.alternativeProvider!)} instead. 
                Available calls: {getRemainingForAction(alternativeStatus)}
              </AlertDescription>
            </Alert>
          )}

          {/* Provider Status Summary */}
          {status && (
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">Current API Status:</div>
              <div className="space-y-1">
                {status.providers.map(provider => (
                  <div key={provider.provider} className="flex justify-between">
                    <span>{provider.provider}:</span>
                    <Badge variant={provider.canMakeRequest ? 'default' : 'destructive'} className="text-xs">
                      {provider.canMakeRequest ? 'Available' : 'Limited'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!canProceed || confirming}
            variant={warningLevel === 'critical' ? 'destructive' : warningLevel === 'warning' ? 'secondary' : 'default'}
            className="min-w-[120px]"
          >
            {confirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                {warningLevel === 'critical' ? 'Force Proceed' : 'Proceed'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easy integration with components
export function useApiWarning() {
  const [dialogState, setDialogState] = useState<{
    open: boolean
    action?: ApiAction
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
  }>({
    open: false
  })

  const showWarning = (
    action: ApiAction, 
    onConfirm: () => void | Promise<void>,
    onCancel?: () => void
  ) => {
    setDialogState({
      open: true,
      action,
      onConfirm,
      onCancel
    })
  }

  const closeWarning = () => {
    setDialogState({ open: false })
  }

  const WarningDialog = dialogState.action ? (
    <ApiWarningDialog
      open={dialogState.open}
      onOpenChange={closeWarning}
      action={dialogState.action}
      onConfirm={dialogState.onConfirm || (() => {})}
      onCancel={dialogState.onCancel}
    />
  ) : null

  return {
    showWarning,
    closeWarning,
    WarningDialog
  }
}

// Common API actions for easy reuse
export const ApiActions = {
  enrichPositions: (count: number): ApiAction => ({
    name: 'Enrich Portfolio Positions',
    description: `Fetch detailed company fundamentals for ${count} position${count !== 1 ? 's' : ''}`,
    provider: 'tiingo',
    alternativeProvider: 'alphavantage',
    estimatedCalls: count,
    category: 'enrichment'
  }),

  refreshPortfolio: (): ApiAction => ({
    name: 'Refresh Portfolio Data',
    description: 'Fetch latest positions and account information from Trading212',
    provider: 'trading212',
    estimatedCalls: 2, // account + positions
    category: 'data-fetch'
  }),

  analyzeSector: (symbols: string[]): ApiAction => ({
    name: 'Analyze Sector Allocation',
    description: `Fetch sector data for ${symbols.length} position${symbols.length !== 1 ? 's' : ''}`,
    provider: 'tiingo',
    alternativeProvider: 'alphavantage',
    estimatedCalls: symbols.length,
    category: 'analysis'
  }),

  bulkEnrichment: (count: number): ApiAction => ({
    name: 'Bulk Portfolio Enrichment',
    description: `Comprehensive enrichment of ${count} positions with fundamentals, sectors, and analytics`,
    provider: 'tiingo',
    alternativeProvider: 'alphavantage',
    estimatedCalls: count,
    category: 'enrichment'
  })
} 