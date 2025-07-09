'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  HelpCircle, 
  X, 
  Zap,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HelpContent {
  title: string
  description: string
  tips?: string[]
  warning?: string
  example?: string
  relatedTopics?: string[]
  apiCost?: number
  learnMoreUrl?: string
}

interface ContextualHelpProps {
  content: HelpContent
  trigger?: 'hover' | 'click'
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const helpTopics: Record<string, HelpContent> = {
  'api-limits': {
    title: 'API Limits',
    description: 'Our system uses multiple data providers with different rate limits. We automatically handle switching between providers when limits are reached.',
    tips: [
      'Each action shows its estimated API cost',
      'Green badges = safe, yellow = warning, red = limited',
      'System automatically switches providers when needed'
    ],
    warning: 'Free tiers have daily limits. Consider batching operations.',
    apiCost: 0,
    learnMoreUrl: '#help'
  },
  'provider-switching': {
    title: 'Automatic Provider Switching',
    description: 'When one API provider hits its limits, we seamlessly switch to backup providers to keep your data flowing.',
    tips: [
      'Alpha Vantage → Tiingo → Cache fallback',
      'No action required from you',
      'Data quality remains high across providers'
    ],
    example: 'If Alpha Vantage is limited, we automatically use Tiingo for fresh data',
    learnMoreUrl: '#help'
  },
  'cache-fallback': {
    title: 'Cache Fallback',
    description: 'When all API providers are limited, we use cached data to keep functionality available.',
    tips: [
      'Cached data shows age indicators',
      'For analysis, slightly stale data is usually fine',
      'Cache automatically refreshes when APIs are available'
    ],
    warning: 'Cached data may be hours old - check timestamps for critical decisions',
    learnMoreUrl: '#help'
  },
  'api-cost': {
    title: 'API Call Costs',
    description: 'Each operation consumes API calls from our daily quotas. We show estimated costs before each action.',
    tips: [
      'Batch operations are more efficient',
      'Portfolio refresh costs 1 call per position',
      'Sector analysis costs 1 call per unique sector'
    ],
    example: 'Refreshing 10 positions = 10 API calls',
    apiCost: 1,
    learnMoreUrl: '#help'
  },
  'enrichment': {
    title: 'Position Enrichment',
    description: 'We enhance your basic position data with fundamental information like sector, industry, market cap, and financial metrics.',
    tips: [
      'Enrichment improves portfolio analysis accuracy',
      'Data includes sector, industry, PE ratios, and more',
      'Larger positions have bigger impact on analysis'
    ],
    apiCost: 1,
    example: 'Enriching AAPL adds sector (Technology), market cap ($2.8T), PE ratio (28.5)',
    learnMoreUrl: '#help'
  },
  'sector-analysis': {
    title: 'Sector Analysis',
    description: 'Analyzes your portfolio allocation across different business sectors to help identify concentration risks.',
    tips: [
      'Diversification across sectors reduces risk',
      'Technology heavy? Consider other sectors',
      'Sector performance varies by market cycle'
    ],
    apiCost: 5,
    warning: 'High sector concentration can increase portfolio volatility',
    learnMoreUrl: '#help'
  },
  'risk-analysis': {
    title: 'Risk Analysis',
    description: 'Evaluates portfolio risk through various metrics including volatility, concentration, and correlation analysis.',
    tips: [
      'Risk scores help compare investment options',
      'Diversification typically reduces overall risk',
      'Consider risk tolerance when rebalancing'
    ],
    apiCost: 15,
    warning: 'Past performance does not guarantee future results',
    learnMoreUrl: '#help'
  },
  'data-freshness': {
    title: 'Data Freshness',
    description: 'We indicate how recent your data is and automatically refresh when possible within API limits.',
    tips: [
      'Green = fresh (< 1 hour old)',
      'Yellow = recent (1-24 hours old)', 
      'Orange = stale (> 24 hours old)'
    ],
    example: 'Last updated: 2 hours ago (from Alpha Vantage cache)',
    learnMoreUrl: '#help'
  }
}

export function ContextualHelp({ 
  content, 
  trigger = 'hover',
  position = 'top',
  size = 'md',
  className 
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleHelp = () => {
    if (trigger === 'click') {
      setIsOpen(!isOpen)
    }
  }

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsOpen(true)
    }
  }

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsOpen(false)
    }
  }

  const getTooltipClasses = () => {
    const baseClasses = "absolute z-50 bg-popover text-popover-foreground shadow-lg border rounded-lg"
    const sizeClasses = {
      sm: "w-64 p-3",
      md: "w-80 p-4", 
      lg: "w-96 p-5"
    }
    
    const positionClasses = {
      top: "bottom-full mb-2 left-1/2 transform -translate-x-1/2",
      bottom: "top-full mt-2 left-1/2 transform -translate-x-1/2",
      left: "right-full mr-2 top-1/2 transform -translate-y-1/2",
      right: "left-full ml-2 top-1/2 transform -translate-y-1/2"
    }

    return cn(baseClasses, sizeClasses[size], positionClasses[position])
  }

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-5 w-5 p-0 text-muted-foreground hover:text-foreground", className)}
        onClick={toggleHelp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div 
          className={getTooltipClasses()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <h4 className="font-semibold text-sm">{content.title}</h4>
              {trigger === 'click' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {content.description}
            </p>

            {/* API Cost */}
            {content.apiCost !== undefined && (
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-blue-500" />
                <Badge variant="outline" className="text-xs">
                  {content.apiCost} API call{content.apiCost !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}

            {/* Tips */}
            {content.tips && content.tips.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs font-medium">Tips:</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5 ml-4">
                  {content.tips.map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warning */}
            {content.warning && (
              <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded border-l-2 border-orange-500">
                <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  {content.warning}
                </p>
              </div>
            )}

            {/* Example */}
            {content.example && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3 text-purple-500" />
                  <span className="text-xs font-medium">Example:</span>
                </div>
                <p className="text-xs text-muted-foreground italic ml-4">
                  {content.example}
                </p>
              </div>
            )}

            {/* Learn More */}
            {content.learnMoreUrl && (
              <div className="pt-2 border-t">
                <a 
                  href={content.learnMoreUrl}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <ExternalLink className="h-3 w-3" />
                  Learn more
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Preset help components for common topics
export const ApiLimitsHelp = () => (
  <ContextualHelp content={helpTopics['api-limits']} />
)

export const ProviderSwitchingHelp = () => (
  <ContextualHelp content={helpTopics['provider-switching']} />
)

export const CacheFallbackHelp = () => (
  <ContextualHelp content={helpTopics['cache-fallback']} />
)

export const ApiCostHelp = () => (
  <ContextualHelp content={helpTopics['api-cost']} />
)

export const EnrichmentHelp = () => (
  <ContextualHelp content={helpTopics['enrichment']} />
)

export const SectorAnalysisHelp = () => (
  <ContextualHelp content={helpTopics['sector-analysis']} />
)

export const RiskAnalysisHelp = () => (
  <ContextualHelp content={helpTopics['risk-analysis']} />
)

export const DataFreshnessHelp = () => (
  <ContextualHelp content={helpTopics['data-freshness']} />
)

// Quick access component for getting help by topic ID
export function QuickHelp({ topic, ...props }: { topic: string } & Omit<ContextualHelpProps, 'content'>) {
  const content = helpTopics[topic]
  if (!content) {
    console.warn(`Help topic "${topic}" not found`)
    return null
  }
  
  return <ContextualHelp content={content} {...props} />
} 