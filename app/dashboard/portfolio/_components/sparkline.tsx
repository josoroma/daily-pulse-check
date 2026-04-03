'use client'

import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export const Sparkline = ({ data, width = 80, height = 28, color }: SparklineProps) => {
  if (data.length < 2) return null

  const first = data[0]!
  const last = data[data.length - 1]!
  const isPositive = last >= first
  const strokeColor = color ?? (isPositive ? 'hsl(160, 60%, 45%)' : 'hsl(0, 70%, 50%)')

  const chartData = data.map((price, i) => ({ i, price }))

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient
              id={`sparkGrad-${isPositive ? 'up' : 'down'}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#sparkGrad-${isPositive ? 'up' : 'down'})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
