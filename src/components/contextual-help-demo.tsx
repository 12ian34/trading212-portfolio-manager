'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ContextualHelp,
  QuickHelp,
  ApiLimitsHelp,
  ProviderSwitchingHelp,
  CacheFallbackHelp,
  ApiCostHelp,
  EnrichmentHelp,
  SectorAnalysisHelp,
  RiskAnalysisHelp,
  DataFreshnessHelp,
  HelpContent
} from '@/components/contextual-help'
import { 
  HelpCircle, 
  Zap, 
  RefreshCw, 
  PieChart, 
  TrendingUp, 
  Database,
  Shield,
  Clock
} from 'lucide-react'

export function ContextualHelpDemo() {
  const customHelpContent: HelpContent = {
    title: 'Custom Help Example',
    description: 'This demonstrates a custom help tooltip with all available features.',
    tips: [
      'This shows how to create custom help content',
      'Tips appear as bullet points for easy reading',
      'Multiple tips help break down complex concepts'
    ],
    warning: 'This is an example warning message that appears in orange',
    example: 'Custom help tooltips can contain examples like this one',
    apiCost: 5,
    learnMoreUrl: '#help'
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Contextual Help System Demo</h2>
        <p className="text-muted-foreground">
          Interactive help tooltips to guide users through complex features
        </p>
      </div>

      {/* Preset Help Components */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Preset Help Components</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardDescription>
            Pre-configured help tooltips for common features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* API Limits */}
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">API Limits</span>
              </div>
              <ApiLimitsHelp />
            </div>

            {/* Provider Switching */}
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Provider Switching</span>
              </div>
              <ProviderSwitchingHelp />
            </div>

            {/* Cache Fallback */}
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Cache Fallback</span>
              </div>
              <CacheFallbackHelp />
            </div>

            {/* API Cost */}
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">API Costs</span>
              </div>
              <ApiCostHelp />
            </div>

            {/* Enrichment */}
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Position Enrichment</span>
              </div>
              <EnrichmentHelp />
            </div>

            {/* Sector Analysis */}
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">Sector Analysis</span>
              </div>
              <SectorAnalysisHelp />
            </div>

            {/* Risk Analysis */}
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Risk Analysis</span>
              </div>
              <RiskAnalysisHelp />
            </div>

            {/* Data Freshness */}
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-500" />
                <span className="text-sm font-medium">Data Freshness</span>
              </div>
              <DataFreshnessHelp />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Help by Topic ID */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Quick Help by Topic</CardTitle>
            <QuickHelp topic="api-limits" trigger="hover" />
          </div>
          <CardDescription>
            Using the QuickHelp component with topic IDs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              Enrich Positions
              <QuickHelp topic="enrichment" trigger="hover" />
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              Analyze Sectors  
              <QuickHelp topic="sector-analysis" trigger="hover" />
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              Check Cache
              <QuickHelp topic="cache-fallback" trigger="hover" />
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              Switch Provider
              <QuickHelp topic="provider-switching" trigger="hover" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Help Examples */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Custom Help Examples</CardTitle>
            <ContextualHelp content={customHelpContent} trigger="hover" />
          </div>
          <CardDescription>
            Custom help content with different configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Different Trigger Types */}
          <div className="space-y-2">
            <h4 className="font-medium">Trigger Types</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Hover trigger:</span>
                <ContextualHelp 
                  content={customHelpContent} 
                  trigger="hover" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Click trigger:</span>
                <ContextualHelp 
                  content={customHelpContent} 
                  trigger="click" 
                />
              </div>
            </div>
          </div>

          {/* Different Sizes */}
          <div className="space-y-2">
            <h4 className="font-medium">Tooltip Sizes</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Small:</span>
                <ContextualHelp 
                  content={customHelpContent} 
                  size="sm" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Medium:</span>
                <ContextualHelp 
                  content={customHelpContent} 
                  size="md" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Large:</span>
                <ContextualHelp 
                  content={customHelpContent} 
                  size="lg" 
                />
              </div>
            </div>
          </div>

          {/* Different Positions */}
          <div className="space-y-2">
            <h4 className="font-medium">Tooltip Positions</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 border rounded">
                <p className="text-sm mb-2">Top</p>
                <ContextualHelp 
                  content={customHelpContent} 
                  position="top" 
                />
              </div>
              <div className="p-4 border rounded">
                <p className="text-sm mb-2">Bottom</p>
                <ContextualHelp 
                  content={customHelpContent} 
                  position="bottom" 
                />
              </div>
              <div className="p-4 border rounded">
                <p className="text-sm mb-2">Left</p>
                <ContextualHelp 
                  content={customHelpContent} 
                  position="left" 
                />
              </div>
              <div className="p-4 border rounded">
                <p className="text-sm mb-2">Right</p>
                <ContextualHelp 
                  content={customHelpContent} 
                  position="right" 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Help Content Features</CardTitle>
          <CardDescription>
            Different types of help content elements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Help */}
            <div className="p-4 border rounded space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Basic Help</h4>
                <ContextualHelp 
                  content={{
                    title: 'Simple Help',
                    description: 'Basic help tooltip with just title and description.'
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Title + Description only</p>
            </div>

            {/* Help with Tips */}
            <div className="p-4 border rounded space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">With Tips</h4>
                <ContextualHelp 
                  content={{
                    title: 'Help with Tips',
                    description: 'Help tooltip that includes helpful tips.',
                    tips: ['Tip one', 'Tip two', 'Tip three']
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Includes bullet-point tips</p>
            </div>

            {/* Help with Warning */}
            <div className="p-4 border rounded space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">With Warning</h4>
                <ContextualHelp 
                  content={{
                    title: 'Help with Warning',
                    description: 'Help tooltip that includes a warning message.',
                    warning: 'This is an important warning message.'
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Orange warning section</p>
            </div>

            {/* Help with API Cost */}
            <div className="p-4 border rounded space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">With API Cost</h4>
                <ContextualHelp 
                  content={{
                    title: 'API Operation',
                    description: 'Operation that consumes API calls.',
                    apiCost: 10
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Shows API call consumption</p>
            </div>

            {/* Help with Example */}
            <div className="p-4 border rounded space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">With Example</h4>
                <ContextualHelp 
                  content={{
                    title: 'Help with Example',
                    description: 'Help that includes a practical example.',
                    example: 'For instance: AAPL, GOOGL, MSFT would be 3 API calls'
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Practical usage examples</p>
            </div>

            {/* Complete Help */}
            <div className="p-4 border rounded space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Complete Help</h4>
                <ContextualHelp 
                  content={{
                    title: 'Complete Help Example',
                    description: 'Full-featured help with all elements.',
                    tips: ['Comprehensive guidance', 'Multiple useful tips'],
                    warning: 'Important considerations to keep in mind',
                    example: 'Real-world usage example provided here',
                    apiCost: 15,
                    learnMoreUrl: '#help'
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">All features combined</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Integration in Components</CardTitle>
          <CardDescription>
            See how contextual help is integrated into real components throughout the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
                             <p className="text-sm">
                 <strong>✅ Enhanced Positions Table:</strong> Help tooltips added to &quot;Enhanced Portfolio Positions&quot; 
                 title and description for enrichment and data freshness guidance.
               </p>
             </div>
             <div className="p-4 bg-muted rounded-lg">
               <p className="text-sm">
                 <strong>✅ Sector Allocation:</strong> Help tooltips integrated into &quot;Sector Allocation Analysis&quot; 
                 header for analysis and API limits information.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>📋 Ready for integration:</strong> Risk Analysis, Geographic Allocation, 
                Performance Monitor, and other components can easily add contextual help using the same patterns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 