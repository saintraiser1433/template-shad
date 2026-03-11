"use client"

import { useMemo } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

const STATUS_COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#8b5cf6"]

type LoanStatusDonutChartProps = {
  data: { label: string; value: number }[]
}

export function LoanStatusDonutChart({ data }: LoanStatusDonutChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.label,
        value: d.value,
      })),
    [data]
  )
  const total = useMemo(
    () => chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData]
  )

  if (chartData.length === 0 || total === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No loan status data
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number, name: string) => [
              `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
              name,
            ]}
          />
          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            formatter={(value, entry) => (
              <span className="text-xs text-muted-foreground">
                {value}: {chartData.find((d) => d.name === value)?.value ?? 0}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
