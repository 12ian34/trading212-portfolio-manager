"use client"

import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Position } from "@/lib/types"

const REGION_COLORS: Record<string, string> = {
  US: "#2563eb",
  UK: "#dc2626",
  DE: "#eab308",
  NL: "#f97316",
  FR: "#8b5cf6",
  Other: "#6b7280",
}

interface RegionChartProps {
  positions: Position[]
}

export function RegionChart({ positions }: RegionChartProps) {
  const data = useMemo(() => {
    const regionMap = new Map<string, number>()
    for (const p of positions) {
      regionMap.set(p.region, (regionMap.get(p.region) || 0) + p.currentValue)
    }
    const total = Array.from(regionMap.values()).reduce((a, b) => a + b, 0)

    return Array.from(regionMap.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        percent: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [positions])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Region Allocation</CardTitle>
      </CardHeader>
      <CardContent>
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
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={REGION_COLORS[entry.name] || REGION_COLORS.Other}
                />
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
      </CardContent>
    </Card>
  )
}
