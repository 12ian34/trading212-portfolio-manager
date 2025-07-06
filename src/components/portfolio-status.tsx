"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { trading212Cache } from '@/lib/trading212-cache'

interface ConnectionStatus {
  trading212: { status: 'connected' | 'error' | 'checking' }
  alphaVantage: { status: 'connected' | 'error' | 'checking' }
}

export function PortfolioStatus() {
  const [connections, setConnections] = useState<ConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkConnections = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Test Trading212 API using cache (to prevent rate limiting)
      let trading212Status: 'connected' | 'error' = 'error'
      try {
        await trading212Cache.getPositions()
        trading212Status = 'connected'
      } catch {
        trading212Status = 'error'
      }
      
      // Test Alpha Vantage API (with a sample symbol)
      const alphaVantageResponse = await fetch('/api/alphavantage/overview?symbol=AAPL')
      const alphaVantageStatus = alphaVantageResponse.ok ? 'connected' : 'error'
      
      setConnections({
        trading212: { status: trading212Status },
        alphaVantage: { status: alphaVantageStatus }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check API connections')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkConnections()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          API Status Check
          <Button
            variant="outline"
            size="sm"
            onClick={checkConnections}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Connections Status */}
        <div>
          <h4 className="font-medium mb-2">API Connections</h4>
          {isLoading ? (
            <Badge variant="outline">Checking connections...</Badge>
          ) : error ? (
            <Badge variant="destructive">{error}</Badge>
          ) : connections ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(connections.trading212.status)}
                  Trading212 API
                </span>
                <Badge className={getStatusColor(connections.trading212.status)}>
                  {connections.trading212.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(connections.alphaVantage.status)}
                  Alpha Vantage API
                </span>
                <Badge className={getStatusColor(connections.alphaVantage.status)}>
                  {connections.alphaVantage.status}
                </Badge>
              </div>
            </div>
          ) : (
            <Badge variant="outline">No connection data</Badge>
          )}
        </div>

        {/* Instructions */}
        <div>
          <h4 className="font-medium mb-2">Instructions</h4>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p>• Green status: API key is valid and working</p>
            <p>• Red status: API key is invalid or API is down</p>
            <p>• Check your .env file has the correct API keys</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 