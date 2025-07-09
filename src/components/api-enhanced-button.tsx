'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  type ApiLimitsSummary,
  type ApiLimitStatus 
} from '@/lib/api-limits-service'
import { type ApiAction } from '@/components/api-warning-dialog'

interface ApiEnhancedButtonProps extends React.ComponentProps<typeof Button> {
  apiAction: ApiAction
  onApiAwareClick?: () => void | Promise<void>
  showUsageIndicator?: boolean
  showRemainingCount?: boolean
  compactMode?: boolean
  realTimeUpdates?: boolean
}

export function ApiEnhancedButton({
  apiAction,
  onApiAwareClick,
  onClick,
  children,
  disabled,
  variant = 'outline',
  size = 'sm',
  className,
  showUsageIndicator = true,
  showRemainingCount = true,
  compactMode = false,
  realTimeUpdates = true,
  ...props
}: ApiEnhancedButtonProps) {
  const [status, setStatus] = useState<ApiLimitsSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/api-limits/status')
      const data = await response.json()
      if (data.success) {
        setStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch API status for button:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    if (realTimeUpdates) {
      // Update every 30 seconds for real-time indicators
      const interval = setInterval(fetchStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [realTimeUpdates])

  const providerStatus = status?.providers.find(p => 
    p.provider.toLowerCase().replace(' ', '') === apiAction.provider.toLowerCase()
  )

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

  const getUsageLevel = (): 'safe' | 'warning' | 'critical' => {
    if (!providerStatus) return 'critical'
    
    const remaining = getRemainingForAction(providerStatus)
    const ratio = apiAction.estimatedCalls / remaining
    
    if (!providerStatus.canMakeRequest || remaining < apiAction.estimatedCalls) {
      return 'critical'
    } else if (ratio > 0.5 || remaining <= 5) {
      return 'warning'  
    } else {
      return 'safe'
    }
  }

  const usageLevel = getUsageLevel()
  const remaining = getRemainingForAction(providerStatus)
  const canProceed = providerStatus?.canMakeRequest && remaining >= apiAction.estimatedCalls

  const getUsageIcon = () => {
    if (loading) return <Loader2 className="h-3 w-3 animate-spin" />
    
    switch (usageLevel) {
      case 'safe':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-3 w-3 text-red-500" />
    }
  }

  const getUsageBadgeVariant = () => {
    switch (usageLevel) {
      case 'safe':
        return 'default'
      case 'warning':
        return 'secondary'
      case 'critical':
        return 'destructive'
    }
  }

  const getButtonVariant = () => {
    if (!canProceed && usageLevel === 'critical') {
      return 'destructive'
    }
    if (usageLevel === 'warning') {
      return 'secondary'
    }
    return variant
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onApiAwareClick) {
      e.preventDefault()
      onApiAwareClick()
    } else if (onClick) {
      onClick(e)
    }
  }

  const formatProvider = (provider: string): string => {
    return provider.charAt(0).toUpperCase() + provider.slice(1)
  }

  const getCostText = (): string => {
    if (apiAction.estimatedCalls === 1) {
      return '1 call'
    }
    return `${apiAction.estimatedCalls} calls`
  }

  const getRemainingText = (): string => {
    if (remaining === Infinity) return '∞'
    return remaining.toString()
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <Button
        variant={getButtonVariant()}
        size={size}
        className={cn(
          'relative transition-all duration-200',
          usageLevel === 'critical' && !canProceed && 'opacity-60',
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        title={`${apiAction.name} - Uses ${getCostText()} from ${formatProvider(apiAction.provider)}`}
        {...props}
      >
        {children}
      </Button>

      {/* Usage Indicator Badge */}
      {showUsageIndicator && !compactMode && (
        <Badge 
          variant={getUsageBadgeVariant()}
          className="absolute -top-2 -right-2 h-5 px-1 text-xs font-medium pointer-events-none"
        >
          <div className="flex items-center gap-1">
            {getUsageIcon()}
            <span>{getCostText()}</span>
          </div>
        </Badge>
      )}

      {/* Compact Usage Indicator */}
      {showUsageIndicator && compactMode && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {getUsageIcon()}
          <span>{getCostText()}</span>
        </div>
      )}

      {/* Remaining Count Indicator */}
      {showRemainingCount && remaining !== Infinity && (
        <Badge variant="outline" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          {getRemainingText()} left
        </Badge>
      )}

      {/* Critical State Overlay */}
      {!canProceed && usageLevel === 'critical' && (
        <div className="absolute inset-0 bg-red-500/10 rounded-md pointer-events-none" />
      )}
    </div>
  )
}

// Simplified version for inline usage
export function ApiUsageBadge({ apiAction, className }: { 
  apiAction: ApiAction
  className?: string 
}) {
  const [status, setStatus] = useState<ApiLimitsSummary | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/api-limits/status')
        const data = await response.json()
        if (data.success) {
          setStatus(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch API status for badge:', error)
      }
    }
    
    fetchStatus()
  }, [])

  const providerStatus = status?.providers.find(p => 
    p.provider.toLowerCase().replace(' ', '') === apiAction.provider.toLowerCase()
  )

  const getRemainingForAction = (provider: ApiLimitStatus | undefined): number => {
    if (!provider) return 0
    
    const limits = [
      provider.remainingMinute,
      provider.remainingHour,
      provider.remainingDay
    ].filter(limit => limit !== null) as number[]
    
    return Math.min(...limits, Infinity)
  }

  const remaining = getRemainingForAction(providerStatus)
  const canProceed = providerStatus?.canMakeRequest && remaining >= apiAction.estimatedCalls

  const getVariant = () => {
    if (!canProceed) return 'destructive'
    if (remaining <= 5) return 'secondary'
    return 'default'
  }

  return (
    <Badge variant={getVariant()} className={cn('text-xs', className)}>
      <Zap className="h-3 w-3 mr-1" />
      {apiAction.estimatedCalls} {apiAction.estimatedCalls === 1 ? 'call' : 'calls'}
    </Badge>
  )
}

// Hook for getting API status in components
export function useApiStatus(provider?: string) {
  const [status, setStatus] = useState<ApiLimitsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
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
    
    fetchStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const providerStatus = provider 
    ? status?.providers.find(p => 
        p.provider.toLowerCase().replace(' ', '') === provider.toLowerCase()
      )
    : null

  return {
    status,
    providerStatus,
    loading,
    refresh: () => {
      setLoading(true)
      return fetch('/api/api-limits/status')
        .then(res => res.json())
        .then(data => {
          if (data.success) setStatus(data.data)
        })
        .finally(() => setLoading(false))
    }
  }
} 