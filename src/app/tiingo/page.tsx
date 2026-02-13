"use client"

import { useQuery } from "@tanstack/react-query"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, XCircle, Globe, TrendingUp } from "lucide-react"
import { useState } from "react"

interface StockEntry {
  ticker: string
  symbol: string
  name: string
  isin: string
  currency: string
  value: number
  found: boolean
  exchange: string | null
  description: string | null
  error: string | null
}

interface TiingoData {
  summary: {
    total: number
    found: number
    missing: number
    foundValue: number
    missingValue: number
    totalValue: number
    coveragePercent: number
    valueCoveragePercent: number
  }
  exchanges: Array<{ name: string; count: number; value: number; stocks: string[] }>
  missingByCurrency: Array<{ currency: string; count: number; value: number; stocks: string[] }>
  stocks: StockEntry[]
}

const PIE_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04",
  "#16a34a", "#0d9488", "#0284c7", "#4f46e5", "#c026d3",
]

const CURRENCY_LABELS: Record<string, string> = {
  GBX: "UK (GBX)",
  GBP: "UK (GBP)",
  EUR: "Europe (EUR)",
  USD: "US (USD)",
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value)
}

export default function TiingoPage() {
  const { data, isLoading, error } = useQuery<TiingoData>({
    queryKey: ["tiingo-data"],
    queryFn: async () => {
      const res = await fetch("/api/tiingo-data")
      if (!res.ok) throw new Error("Failed to load data")
      return res.json()
    },
  })

  const [filter, setFilter] = useState<"all" | "found" | "missing">("all")

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !data) {
    return <p className="text-destructive">Failed to load tiingo-all-stocks.json</p>
  }

  const { summary, exchanges, missingByCurrency, stocks } = data

  // Coverage pie: found vs missing by value
  const coveragePie = [
    { name: "Covered", value: summary.foundValue, color: "#16a34a" },
    { name: "Not covered", value: summary.missingValue, color: "#dc2626" },
  ]

  // Exchange bar chart
  const exchangeBar = exchanges.map((e) => ({
    name: e.name === "null" ? "Unknown" : e.name,
    count: e.count,
    value: Math.round(e.value),
  }))

  // Missing by currency pie
  const missingPie = missingByCurrency.map((m, i) => ({
    name: CURRENCY_LABELS[m.currency] || m.currency,
    value: m.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const filteredStocks = stocks.filter((s) => {
    if (filter === "found") return s.found
    if (filter === "missing") return !s.found
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tiingo Coverage Analysis</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Data from tiingo-all-stocks.json — {summary.total} positions analysed
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stocks</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">
              Portfolio positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Found on Tiingo</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.found}</div>
            <p className="text-xs text-muted-foreground">
              {summary.coveragePercent}% of positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Found</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.missing}</div>
            <p className="text-xs text-muted-foreground">
              {(100 - summary.coveragePercent).toFixed(1)}% of positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value Coverage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.valueCoveragePercent}%</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.foundValue)} of {formatCurrency(summary.totalValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coverage pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={coveragePie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {coveragePie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Exchange breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Found Stocks by Exchange</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={exchangeBar} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === "count" ? `${v} stocks` : formatCurrency(v),
                    name === "count" ? "Stocks" : "Value",
                  ]}
                />
                <Bar dataKey="count" fill="#2563eb" name="count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Missing breakdown */}
      {missingByCurrency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Missing Stocks Breakdown ({summary.missing} stocks, {formatCurrency(summary.missingValue)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={missingPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {missingPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} stocks`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {missingByCurrency.map((m) => (
                  <div key={m.currency} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 shrink-0">
                      {CURRENCY_LABELS[m.currency] || m.currency}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {m.count} stocks ({formatCurrency(m.value)}):{" "}
                      {m.stocks.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Stocks</CardTitle>
            <div className="flex gap-1">
              {(["all", "found", "missing"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {f === "all" ? `All (${summary.total})` : f === "found" ? `Found (${summary.found})` : `Missing (${summary.missing})`}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background">Status</TableHead>
                  <TableHead className="sticky top-0 bg-background">Name</TableHead>
                  <TableHead className="sticky top-0 bg-background">Symbol</TableHead>
                  <TableHead className="sticky top-0 bg-background">Currency</TableHead>
                  <TableHead className="sticky top-0 bg-background">Exchange</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStocks.map((s) => (
                  <TableRow key={s.ticker} className={!s.found ? "opacity-60" : ""}>
                    <TableCell>
                      {s.found ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{s.name}</div>
                      {s.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                          {s.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{s.symbol}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{s.currency}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.exchange || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(s.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
