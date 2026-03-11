"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

function getRandomBarColors(length: number): string[] {
  const colors: string[] = []
  for (let i = 0; i < length; i++) {
    const h = Math.floor(Math.random() * 360)
    const s = 55 + Math.floor(Math.random() * 30)
    const l = 45 + Math.floor(Math.random() * 15)
    colors.push(`hsl(${h}, ${s}%, ${l}%)`)
  }
  return colors
}

type LoanTypeBarChartProps = {
  data: { label: string; value: number }[]
}

export function LoanTypeBarChart({ data }: LoanTypeBarChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.label,
        count: d.value,
      })),
    [data]
  )
  const barColors = useMemo(() => getRandomBarColors(chartData.length), [chartData.length])

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No loan type data
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            angle={-35}
            textAnchor="end"
            height={56}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number) => [value.toLocaleString("en-PH"), "Loans"]}
            labelFormatter={(label) => label}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            name="Loans"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={barColors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
