"use client"

import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Position } from "@/lib/types"

const COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04",
  "#16a34a", "#0d9488", "#0284c7", "#4f46e5", "#c026d3",
  "#dc2626", "#65a30d", "#059669", "#6366f1",
]

interface SectorChartProps {
  positions: Position[]
}

export function SectorChart({ positions }: SectorChartProps) {
  const data = useMemo(() => {
    const sectorMap = new Map<string, number>()
    for (const p of positions) {
      const sector = p.sector || "Unknown"
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + p.currentValue)
    }

    const total = Array.from(sectorMap.values()).reduce((a, b) => a + b, 0)

    return Array.from(sectorMap.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        percent: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [positions])

  const hasSectors = data.some((d) => d.name !== "Unknown")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasSectors ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Loading sector data...
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                dataKey="value"
                nameKey="name"
                paddingAngle={1}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `£${value.toFixed(2)} (${data.find(d => d.name === name)?.percent.toFixed(1)}%)`,
                  name,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
