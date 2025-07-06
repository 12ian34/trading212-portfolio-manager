"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Trading212Position } from '@/lib/types'
import { trading212Cache } from '@/lib/trading212-cache'

interface AccountData {
  cash: number
  free: number
  invested: number
  result: number
  total: number
  ppl: number
  blocked?: number
  dividend?: number
}

export function RealPositionsTable() {
  const [positions, setPositions] = useState<Trading212Position[]>([])
  const [account, setAccount] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (forceRefresh = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (forceRefresh) {
        // Use safe refresh that respects rate limits
        const { positions, account } = await trading212Cache.safeRefresh()
        setPositions(positions)
        setAccount(account)
      } else {
        // Use cache to prevent rate limiting
        const [positionsData, accountData] = await Promise.all([
          trading212Cache.getPositions(),
          trading212Cache.getAccount()
        ])
        setPositions(positionsData)
        setAccount(accountData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    fetchData(true) // Safe refresh that respects rate limits
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatTicker = (ticker: string) => {
    // Convert AAPL_US_EQ to AAPL
    return ticker.split('_')[0]
  }

  const calculateValue = (position: Trading212Position) => {
    return position.currentPrice * position.quantity
  }

  const calculatePnLPercent = (position: Trading212Position) => {
    const value = calculateValue(position)
    if (value === 0) return 0
    return (position.ppl / value) * 100
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600 dark:text-green-400'
    if (pnl < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getPnLIcon = (pnl: number) => {
    if (pnl > 0) return <TrendingUp className="h-3 w-3" />
    if (pnl < 0) return <TrendingDown className="h-3 w-3" />
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Portfolio Positions</CardTitle>
            <CardDescription>
              Real-time data from your Trading212 account
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Account Summary */}
        {account && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Account Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Value</div>
                <div className="font-medium">{formatCurrency(account.total)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Invested</div>
                <div className="font-medium">{formatCurrency(account.invested)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cash</div>
                <div className="font-medium">{formatCurrency(account.free)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">P&L</div>
                <div className={`font-medium flex items-center gap-1 ${getPnLColor(account.ppl)}`}>
                  {getPnLIcon(account.ppl)}
                  {formatCurrency(account.ppl)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg mb-4">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading positions...</span>
          </div>
        )}

        {/* Positions Table */}
        {!isLoading && positions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Avg Price</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Market Value</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>P&L %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => {
                const value = calculateValue(position)
                const pnlPercent = calculatePnLPercent(position)
                
                return (
                  <TableRow key={position.ticker}>
                    <TableCell className="font-medium">
                      {formatTicker(position.ticker)}
                    </TableCell>
                    <TableCell>{position.quantity}</TableCell>
                    <TableCell>{formatCurrency(position.averagePrice)}</TableCell>
                    <TableCell>{formatCurrency(position.currentPrice)}</TableCell>
                    <TableCell>{formatCurrency(value)}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${getPnLColor(position.ppl)}`}>
                        {getPnLIcon(position.ppl)}
                        {formatCurrency(position.ppl)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={pnlPercent > 0 ? "default" : pnlPercent < 0 ? "destructive" : "secondary"}
                        className={pnlPercent > 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                      >
                        {pnlPercent > 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* Empty State */}
        {!isLoading && !error && positions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No positions found in your Trading212 account.</p>
            <p className="text-sm mt-2">Make sure you have some investments in your portfolio.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 