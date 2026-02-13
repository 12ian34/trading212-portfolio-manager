"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react"
import type { Account } from "@/lib/types"

function formatCurrency(value: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value)
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

interface PortfolioOverviewProps {
  account: Account
  positionCount: number
}

export function PortfolioOverview({ account, positionCount }: PortfolioOverviewProps) {
  const pnlPercent = account.totalCost > 0
    ? (account.unrealizedPnL / account.totalCost) * 100
    : 0
  const isPositive = account.unrealizedPnL >= 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(account.totalValue, account.currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(account.availableToTrade, account.currency)} available
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(account.unrealizedPnL, account.currency)}
          </div>
          <p className={`text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {formatPercent(pnlPercent)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(account.totalCost, account.currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            Realized P&L: {formatCurrency(account.realizedPnL, account.currency)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Positions</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{positionCount}</div>
          <p className="text-xs text-muted-foreground">
            Active holdings
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
