'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ApiEnhancedButton, ApiUsageBadge, useApiStatus } from '@/components/api-enhanced-button'
import { ApiActions } from '@/components/api-warning-dialog'
import { RefreshCw, Download, TrendingUp, BarChart3 } from 'lucide-react'

export function ApiIndicatorsDemo() {
  const { status, loading } = useApiStatus()

  const handleDemoAction = (actionName: string) => {
    console.log(`Demo action: ${actionName}`)
    // In real usage, this would trigger the actual API call
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>API Usage Indicators Demo</CardTitle>
        <CardDescription>
          Showcase of enhanced buttons with real-time API usage indicators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* Enhanced Buttons Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Enhanced Buttons with API Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Refresh Portfolio Button */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Portfolio Refresh</h4>
              <ApiEnhancedButton
                apiAction={ApiActions.refreshPortfolio()}
                onApiAwareClick={() => handleDemoAction('refresh portfolio')}
                showUsageIndicator={true}
                showRemainingCount={true}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Portfolio
              </ApiEnhancedButton>
            </div>

            {/* Enrich Positions Button */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Enrich 15 Positions</h4>
              <ApiEnhancedButton
                apiAction={ApiActions.enrichPositions(15)}
                onApiAwareClick={() => handleDemoAction('enrich positions')}
                showUsageIndicator={true}
                showRemainingCount={true}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Enrich Positions
              </ApiEnhancedButton>
            </div>

            {/* Sector Analysis Button */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Sector Analysis</h4>
              <ApiEnhancedButton
                apiAction={ApiActions.analyzeSector(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'])}
                onApiAwareClick={() => handleDemoAction('analyze sectors')}
                showUsageIndicator={true}
                showRemainingCount={true}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analyze Sectors
              </ApiEnhancedButton>
            </div>

            {/* Bulk Enrichment Button */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Bulk Enrichment</h4>
              <ApiEnhancedButton
                apiAction={ApiActions.bulkEnrichment(25)}
                onApiAwareClick={() => handleDemoAction('bulk enrichment')}
                showUsageIndicator={true}
                showRemainingCount={true}
              >
                <Download className="h-4 w-4 mr-2" />
                Bulk Enrich
              </ApiEnhancedButton>
            </div>

            {/* Compact Mode Button */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Compact Mode</h4>
              <ApiEnhancedButton
                apiAction={ApiActions.enrichPositions(8)}
                onApiAwareClick={() => handleDemoAction('compact mode')}
                compactMode={true}
                showUsageIndicator={true}
                showRemainingCount={false}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Compact
              </ApiEnhancedButton>
            </div>

            {/* No Indicators Button */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">No Indicators</h4>
              <ApiEnhancedButton
                apiAction={ApiActions.enrichPositions(3)}
                onApiAwareClick={() => handleDemoAction('no indicators')}
                showUsageIndicator={false}
                showRemainingCount={false}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clean
              </ApiEnhancedButton>
            </div>
          </div>
        </div>

        {/* Usage Badges Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Standalone Usage Badges</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Portfolio Refresh:</span>
              <ApiUsageBadge apiAction={ApiActions.refreshPortfolio()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Enrich 10 Positions:</span>
              <ApiUsageBadge apiAction={ApiActions.enrichPositions(10)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Sector Analysis:</span>
              <ApiUsageBadge apiAction={ApiActions.analyzeSector(['AAPL', 'GOOGL', 'MSFT'])} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Bulk (30 positions):</span>
              <ApiUsageBadge apiAction={ApiActions.bulkEnrichment(30)} />
            </div>
          </div>
        </div>

        {/* Traditional Button with Badge */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Traditional Buttons with Badges</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <ApiUsageBadge apiAction={ApiActions.enrichPositions(12)} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <ApiUsageBadge apiAction={ApiActions.analyzeSector(['AAPL', 'GOOGL'])} />
            </div>
          </div>
        </div>

        {/* Current API Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Current API Status</h3>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading API status...</div>
          ) : status ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {status.providers.map(provider => (
                <div key={provider.provider} className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">{provider.provider}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {provider.remainingDay !== null && (
                      <div>Daily: {provider.remainingDay} remaining</div>
                    )}
                    {provider.remainingHour !== null && (
                      <div>Hourly: {provider.remainingHour} remaining</div>
                    )}
                    {provider.remainingMinute !== null && (
                      <div>Per minute: {provider.remainingMinute} remaining</div>
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${provider.canMakeRequest ? 'text-green-600' : 'text-red-600'}`}>
                    {provider.canMakeRequest ? '✅ Available' : '❌ Limited'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Failed to load API status</div>
          )}
        </div>

        {/* Usage Examples */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Usage Examples</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Green buttons/badges:</strong> Safe to proceed (plenty of API calls available)</p>
            <p>• <strong>Yellow buttons/badges:</strong> Warning (limited API calls remaining)</p>
            <p>• <strong>Red buttons/badges:</strong> Critical (insufficient API calls or rate limited)</p>
            <p>• <strong>Usage indicators:</strong> Show estimated API calls needed for the action</p>
            <p>• <strong>Remaining counters:</strong> Display how many calls are left for the provider</p>
            <p>• <strong>Real-time updates:</strong> Status refreshes every 30 seconds</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 