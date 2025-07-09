'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  Database,
  Shield,
  TrendingUp,
  Globe,
  DollarSign,
  Settings,
  HelpCircle,
  Lightbulb,
  Target,
  BarChart3,
  Timer,
  ArrowRight,
  Info
} from 'lucide-react'
import { useApiStatus } from '@/components/api-enhanced-button'

interface HelpSection {
  id: string
  title: string
  icon: React.ReactNode
  description: string
}

const helpSections: HelpSection[] = [
  {
    id: 'overview',
    title: 'API Limits Overview',
    icon: <BookOpen className="h-5 w-5" />,
    description: 'Learn what API limits are and why they exist'
  },
  {
    id: 'providers',
    title: 'API Providers',
    icon: <Globe className="h-5 w-5" />,
    description: 'Understanding different data providers and their limits'
  },
  {
    id: 'system',
    title: 'How Our System Works',
    icon: <Shield className="h-5 w-5" />,
    description: 'How we handle limits with fallbacks and provider switching'
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    icon: <Target className="h-5 w-5" />,
    description: 'Tips for optimizing your API usage'
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: <Settings className="h-5 w-5" />,
    description: 'Common issues and how to resolve them'
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: <HelpCircle className="h-5 w-5" />,
    description: 'Frequently asked questions'
  }
]

export function ApiLimitsHelp() {
  const [activeSection, setActiveSection] = useState('overview')
  const { status: apiStatus, loading: apiLoading } = useApiStatus()

  const renderCurrentStatus = () => {
    if (apiLoading) return <div className="text-sm text-muted-foreground">Loading...</div>
    
    if (!apiStatus) return <div className="text-sm text-red-500">Status unavailable</div>

    return (
      <div className="space-y-2">
        {apiStatus.providers.map(provider => {
          const isLimited = !provider.canMakeRequest
          const isWarning = provider.remainingDay !== null && provider.remainingDay <= 5
          
          return (
            <div key={provider.provider} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isLimited ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <span className="font-medium">{provider.provider}</span>
              </div>
              <div className="text-sm space-x-2">
                {provider.remainingDay !== null && (
                  <Badge variant={isWarning ? 'secondary' : 'outline'}>
                    {provider.remainingDay}/day
                  </Badge>
                )}
                {provider.remainingMinute !== null && (
                  <Badge variant={provider.remainingMinute === 0 ? 'destructive' : 'outline'}>
                    {provider.remainingMinute}/min
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">What are API Limits?</h3>
        <p className="text-muted-foreground mb-4">
          API limits are restrictions placed by data providers to control how many requests 
          can be made within specific time periods. They help ensure fair usage and system stability.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-blue-500" />
              <h4 className="font-medium">Rate Limits</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              How many requests per minute/hour
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              <h4 className="font-medium">Daily Quotas</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Total requests allowed per day
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <h4 className="font-medium">Pricing Tiers</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Free vs. paid plan differences
            </p>
          </Card>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Why limits exist:</strong> API providers use limits to prevent abuse, ensure 
          service quality for all users, and manage server resources effectively.
        </AlertDescription>
      </Alert>

      <div>
        <h3 className="text-lg font-semibold mb-3">Current Status</h3>
        {renderCurrentStatus()}
      </div>
    </div>
  )

  const renderProviders = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <h3 className="font-semibold">Alpha Vantage</h3>
            <Badge variant="secondary">Primary</Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Daily Limit:</span>
              <span className="font-medium">25 requests</span>
            </div>
            <div className="flex justify-between">
              <span>Rate Limit:</span>
              <span className="font-medium">5 per minute</span>
            </div>
            <div className="flex justify-between">
              <span>Data Quality:</span>
              <span className="font-medium">Excellent</span>
            </div>
            <div className="flex justify-between">
              <span>Best For:</span>
              <span className="font-medium">Fundamentals</span>
            </div>
          </div>
          <Alert className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Free tier is quite restrictive. Consider upgrading for heavier usage.
            </AlertDescription>
          </Alert>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <h3 className="font-semibold">Tiingo</h3>
            <Badge variant="outline">Backup</Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Daily Limit:</span>
              <span className="font-medium">1,000 requests</span>
            </div>
            <div className="flex justify-between">
              <span>Rate Limit:</span>
              <span className="font-medium">50 per hour</span>
            </div>
            <div className="flex justify-between">
              <span>Data Quality:</span>
              <span className="font-medium">Very Good</span>
            </div>
            <div className="flex justify-between">
              <span>Best For:</span>
              <span className="font-medium">Price data</span>
            </div>
          </div>
          <Alert className="mt-3">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              More generous limits make this our primary fallback provider.
            </AlertDescription>
          </Alert>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Provider Selection Strategy</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">1</span>
            </div>
            <div>
              <p className="font-medium">Alpha Vantage First</p>
              <p className="text-sm text-muted-foreground">
                We try Alpha Vantage first for the highest quality data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-4" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-green-600">2</span>
            </div>
            <div>
              <p className="font-medium">Tiingo Fallback</p>
              <p className="text-sm text-muted-foreground">
                If Alpha Vantage is limited, we automatically switch to Tiingo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-4" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-yellow-600">3</span>
            </div>
            <div>
              <p className="font-medium">Cache Fallback</p>
              <p className="text-sm text-muted-foreground">
                If both APIs are limited, we use cached data with staleness indicators
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSystem = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Our Protection System</h3>
        <p className="text-muted-foreground mb-4">
          We&apos;ve built a comprehensive system to handle API limits gracefully, 
          ensuring you always get the best available data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h4 className="font-medium">Pre-Action Warnings</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Before any API-consuming action, we show you:
          </p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Estimated API calls needed</li>
            <li>• Remaining limits for each provider</li>
            <li>• Alternative providers available</li>
            <li>• Cost breakdown and impact</li>
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <h4 className="font-medium">Real-time Indicators</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Throughout the UI, you&apos;ll see:
          </p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• API usage badges on buttons</li>
            <li>• Remaining call counters</li>
            <li>• Color-coded status indicators</li>
            <li>• Provider switching notifications</li>
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-green-500" />
            <h4 className="font-medium">Automatic Fallbacks</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            When limits are reached, we automatically:
          </p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Switch to alternative providers</li>
            <li>• Use cached data when available</li>
            <li>• Retry with exponential backoff</li>
            <li>• Maintain core functionality</li>
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-purple-500" />
            <h4 className="font-medium">Smart Caching</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Our caching system provides:
          </p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Instant access to recent data</li>
            <li>• Staleness indicators and age</li>
            <li>• Automatic cache cleanup</li>
            <li>• Cross-provider data merging</li>
          </ul>
        </Card>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>The result:</strong> You get a seamless experience even when API providers 
          are limited, with clear information about data sources and freshness.
        </AlertDescription>
      </Alert>
    </div>
  )

  const renderBestPractices = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Optimizing Your API Usage</h3>
        <p className="text-muted-foreground mb-4">
          Follow these best practices to get the most out of your API limits.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Batch Your Operations</h4>
              <p className="text-sm text-green-700 mt-1">
                Instead of refreshing individual positions, refresh your entire portfolio at once. 
                This is more efficient and uses fewer API calls per position.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Time Your Updates</h4>
              <p className="text-sm text-blue-700 mt-1">
                Refresh data during off-peak hours when possible. Consider doing bulk updates 
                once or twice per day rather than constantly throughout the day.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-purple-200 bg-purple-50">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">Leverage Cached Data</h4>
              <p className="text-sm text-purple-700 mt-1">
                For most analysis, cached data that&apos;s a few hours old is perfectly fine. 
                Only refresh when you need the absolute latest information.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900">Focus on What Matters</h4>
              <p className="text-sm text-orange-700 mt-1">
                Prioritize enriching your largest positions first. They have the biggest impact 
                on your portfolio analysis and are worth the API calls.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">API Call Estimates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Common Operations:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Portfolio refresh (10 positions)</span>
                <Badge variant="outline">10 calls</Badge>
              </div>
              <div className="flex justify-between">
                <span>Sector analysis (5 sectors)</span>
                <Badge variant="outline">5 calls</Badge>
              </div>
              <div className="flex justify-between">
                <span>Single position enrichment</span>
                <Badge variant="outline">1 call</Badge>
              </div>
              <div className="flex justify-between">
                <span>Risk assessment (15 positions)</span>
                <Badge variant="outline">15 calls</Badge>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Daily Budget Recommendations:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Conservative usage</span>
                <Badge variant="secondary">5-10 calls/day</Badge>
              </div>
              <div className="flex justify-between">
                <span>Moderate usage</span>
                <Badge variant="secondary">10-20 calls/day</Badge>
              </div>
              <div className="flex justify-between">
                <span>Heavy usage</span>
                <Badge variant="destructive">20+ calls/day</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTroubleshooting = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Common Issues & Solutions</h3>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h4 className="font-medium text-red-900 mb-2">❌ &quot;API limit exceeded&quot; error</h4>
          <div className="space-y-2 text-sm">
            <p><strong>Cause:</strong> You&apos;ve hit the daily or rate limit for a provider.</p>
            <p><strong>Solution:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Wait for limits to reset (usually 1 minute for rate limits, 24 hours for daily)</li>
              <li>The system will automatically try alternative providers</li>
              <li>Use cached data in the meantime</li>
              <li>Consider upgrading to a paid API plan</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ Stale data warnings</h4>
          <div className="space-y-2 text-sm">
            <p><strong>Cause:</strong> Using cached data because APIs are limited.</p>
            <p><strong>Solution:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Check the data age indicator to see how old it is</li>
              <li>For most analysis, data a few hours old is fine</li>
              <li>Wait for API limits to reset for fresh data</li>
              <li>Prioritize which data needs to be most current</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">🔄 Slow loading times</h4>
          <div className="space-y-2 text-sm">
            <p><strong>Cause:</strong> Rate limiting causing delays between API calls.</p>
            <p><strong>Solution:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>This is normal behavior to respect API limits</li>
              <li>Use cached data for faster access</li>
              <li>Batch operations when possible</li>
              <li>Be patient - the system is protecting your limits</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium text-purple-900 mb-2">🔀 Provider switching notifications</h4>
          <div className="space-y-2 text-sm">
            <p><strong>Cause:</strong> System automatically switched to backup provider.</p>
            <p><strong>Solution:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>This is working as intended - no action needed</li>
              <li>You&apos;re getting the best available data</li>
              <li>The switch is transparent and automatic</li>
              <li>Data quality remains high across providers</li>
            </ul>
          </div>
        </Card>
      </div>

      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription>
          <strong>Pro tip:</strong> Most &quot;issues&quot; are actually the system working correctly to 
          protect your API limits while ensuring you still get the data you need.
        </AlertDescription>
      </Alert>
    </div>
  )

  const renderFAQ = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <Card className="p-4">
          <h4 className="font-medium mb-2">Q: Why do I see different providers for different requests?</h4>
          <p className="text-sm text-muted-foreground">
            A: Our system automatically chooses the best available provider based on current limits. 
            This ensures you always get data while staying within limits.
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-2">Q: Is cached data reliable for portfolio analysis?</h4>
          <p className="text-sm text-muted-foreground">
            A: Yes! For most portfolio analysis, data that&apos;s a few hours old is perfectly adequate. 
            Stock prices and fundamentals don&apos;t change dramatically within hours.
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-2">Q: How can I see which provider was used for my data?</h4>
          <p className="text-sm text-muted-foreground">
            A: Look for provider badges and data source indicators throughout the UI. 
            Each piece of data shows which provider it came from and when it was last updated.
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-2">Q: What happens if all APIs are limited?</h4>
          <p className="text-sm text-muted-foreground">
            A: The system falls back to cached data, clearly indicating the age and source. 
            Core functionality remains available even when all external APIs are limited.
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-2">Q: Should I upgrade to paid API plans?</h4>
          <p className="text-sm text-muted-foreground">
            A: Consider upgrading if you frequently hit limits or need real-time data. 
            For casual portfolio analysis, free tiers with our smart caching are usually sufficient.
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-2">Q: How often do API limits reset?</h4>
          <p className="text-sm text-muted-foreground">
            A: Rate limits typically reset every minute or hour, while daily quotas reset at midnight UTC. 
            Our system tracks these automatically and shows countdown timers when limits are hit.
          </p>
        </Card>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview()
      case 'providers': return renderProviders()
      case 'system': return renderSystem()
      case 'best-practices': return renderBestPractices()
      case 'troubleshooting': return renderTroubleshooting()
      case 'faq': return renderFAQ()
      default: return renderOverview()
    }
  }

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          API Limits Help & Education
        </CardTitle>
        <CardDescription>
          Everything you need to know about API limits and how our system manages them
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {helpSections.map(section => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? 'default' : 'ghost'}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className="flex items-start gap-3">
                    {section.icon}
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-muted-foreground">{section.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="min-h-[600px]">
              {renderContent()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 