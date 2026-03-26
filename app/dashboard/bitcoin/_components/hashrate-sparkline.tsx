'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface HashrateSparklineProps {
  hashrates: Array<{ timestamp: number; avgHashrate: number }>
}

export function HashrateSparkline({ hashrates }: HashrateSparklineProps) {
  if (hashrates.length < 2) return null

  const data = hashrates.map((h) => ({ v: h.avgHashrate }))

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="hsl(35, 95%, 55%)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
