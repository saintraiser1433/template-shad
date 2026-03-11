"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type CollectionsLineChartProps = {
  data: { label: string; value: number }[]
}

export function CollectionsLineChart({ data }: CollectionsLineChartProps) {
  const chartData = data.map((d) => ({
    name: d.label,
    amount: d.value,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        No collection data
      </div>
    )
  }

  return (
    <div className="h-80 w-full sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number) => [`₱${value.toLocaleString("en-PH")}`, "Amount"]}
            labelFormatter={(label) => label}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", r: 4 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
