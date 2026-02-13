"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import type { Position } from "@/lib/types"

function formatCurrency(value: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return "-"
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  return value.toFixed(2)
}

type SortKey = "name" | "currentValue" | "unrealizedPnL" | "pnlPercent" | "weight" | "sector" | "peRatio"

interface PositionsTableProps {
  positions: Position[]
}

export function PositionsTable({ positions }: PositionsTableProps) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("currentValue")
  const [sortAsc, setSortAsc] = useState(false)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const result = positions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.symbol.toLowerCase().includes(q) ||
        p.ticker.toLowerCase().includes(q) ||
        (p.sector && p.sector.toLowerCase().includes(q))
    )

    result.sort((a, b) => {
      let aVal: string | number = 0
      let bVal: string | number = 0

      switch (sortKey) {
        case "name":
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case "currentValue":
          aVal = a.currentValue
          bVal = b.currentValue
          break
        case "unrealizedPnL":
          aVal = a.unrealizedPnL
          bVal = b.unrealizedPnL
          break
        case "pnlPercent":
          aVal = a.pnlPercent
          bVal = b.pnlPercent
          break
        case "weight":
          aVal = a.weight
          bVal = b.weight
          break
        case "sector":
          aVal = (a.sector || "zzz").toLowerCase()
          bVal = (b.sector || "zzz").toLowerCase()
          break
        case "peRatio":
          aVal = a.peRatio ?? -Infinity
          bVal = b.peRatio ?? -Infinity
          break
      }

      if (aVal < bVal) return sortAsc ? -1 : 1
      if (aVal > bVal) return sortAsc ? 1 : -1
      return 0
    })

    return result
  }, [positions, search, sortKey, sortAsc])

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search positions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Name" col="name" />
              <TableHead>Region</TableHead>
              <SortHeader label="Sector" col="sector" />
              <SortHeader label="Value" col="currentValue" />
              <SortHeader label="P&L" col="unrealizedPnL" />
              <SortHeader label="P&L %" col="pnlPercent" />
              <SortHeader label="Weight" col="weight" />
              <SortHeader label="P/E" col="peRatio" />
              <TableHead>Mkt Cap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.ticker}>
                <TableCell>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.symbol}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {p.region}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {p.sector || <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(p.currentValue, p.walletCurrency)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-sm ${
                    p.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(p.unrealizedPnL, p.walletCurrency)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-sm ${
                    p.pnlPercent >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPercent(p.pnlPercent)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {p.weight.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {p.peRatio != null ? p.peRatio.toFixed(1) : "-"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatNumber(p.marketCap)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {positions.length} positions
      </p>
    </div>
  )
}
