'use client'

import * as React from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ReferenceDot, Legend,
} from 'recharts'
import { useCalculatorStore } from './store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ResultPoint } from '@/lib/calculator'

interface ChartDatum extends ResultPoint {
  Rlabel: string
}

export function ResultChart() {
  const { output, strategies, plateau } = useCalculatorStore()

  const data: ChartDatum[] = React.useMemo(() => {
    if (!output?.results) return []
    return output.results.map((r) => ({ ...r, Rlabel: `${(r.R * 100).toFixed(0)}%` }))
  }, [output])

  const hasPlateau = plateau && Math.abs(plateau.rMax - plateau.rMin) > 0.005

  const chartConfig = {
    Y: { label: '综合效益 Y', color: 'var(--chart-1)' },
    A_rel: { label: '光合保留率 A_rel', color: 'var(--chart-3)' },
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">综合效益曲线</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
            请填写参数后查看结果
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-[17px] flex items-center justify-between">
          <span>综合效益曲线 Y = A_rel × (1 − L)</span>
          {hasPlateau && (
            <span className="text-xs font-normal text-muted-foreground">
              黄色带 = 近优区间
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="Rlabel"
                stroke="var(--muted-foreground)"
                fontSize={11}
                interval={4}
                label={{ value: '遮阳率 R', position: 'insideBottom', offset: -2, fontSize: 12 }}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 1]}
                stroke="var(--chart-1)"
                fontSize={11}
                label={{ value: 'Y', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 1]}
                stroke="var(--chart-3)"
                fontSize={11}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                label={{ value: 'A_rel', angle: 90, position: 'insideRight', fontSize: 12 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const r = item.payload as ResultPoint
                      return (
                        <div className="space-y-0.5 text-xs">
                          <div className="font-semibold">R = {(r.R * 100).toFixed(0)}%</div>
                          <div>Y: {r.Y.toFixed(4)}</div>
                          <div className="text-muted-foreground">A_rel: {(r.A_rel * 100).toFixed(1)}%</div>
                          <div className="text-muted-foreground">损失率: {(r.L * 100).toFixed(1)}%</div>
                          <div className="text-muted-foreground">HHA: {r.HHA.toFixed(1)} °C²·h</div>
                          <div className="text-muted-foreground">棚温: {r.Tmax_cooled}°C</div>
                          {r.S_total != null && (
                            <div className="text-muted-foreground">S_total: {(r.S_total * 100).toFixed(1)}%</div>
                          )}
                        </div>
                      )
                    }}
                  />
                }
              />
              {hasPlateau && (
                <ReferenceArea
                  x1={`${(plateau!.rMin * 100).toFixed(0)}%`}
                  x2={`${(plateau!.rMax * 100).toFixed(0)}%`}
                  fill="var(--accent)"
                  fillOpacity={0.35}
                  stroke="var(--accent-foreground)"
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
              )}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Y"
                name="综合效益 Y"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="A_rel"
                name="光合保留率"
                stroke="var(--chart-3)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                opacity={0.7}
              />
              {/* 策略点标记 */}
              {strategies.map((s) => {
                const datum = data.find((d) => Math.abs(d.R - s.data.R) < 0.005)
                if (!datum) return null
                return (
                  <ReferenceDot
                    key={s.id}
                    yAxisId="left"
                    x={datum.Rlabel}
                    y={s.data.Y}
                    r={6}
                    fill={s.color}
                    stroke="var(--background)"
                    strokeWidth={2}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        {/* 图例：曲线 + 策略点 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5" style={{ backgroundColor: 'var(--chart-1)' }} />
            <span className="text-muted-foreground">综合效益 Y</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 border-t border-dashed" style={{ borderColor: 'var(--chart-3)' }} />
            <span className="text-muted-foreground">光合保留率 A_rel</span>
          </div>
          {strategies.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border-2 border-background"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
