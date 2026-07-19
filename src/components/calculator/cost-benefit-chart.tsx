'use client'

import * as React from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { TrendingUp, DollarSign } from 'lucide-react'
import { useCalculatorStore } from './store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { calcCostBenefitCurve } from '@/lib/calculator/advice'
import type { CostBenefitPoint } from '@/lib/calculator/advice'

export function CostBenefitChart() {
  const { output, params } = useCalculatorStore()

  const data: CostBenefitPoint[] = React.useMemo(() => {
    if (!output?.results) return []
    return calcCostBenefitCurve(output.results, params, output.baseline)
  }, [output, params])

  if (!data.length) return null

  const optR = output?.optimum?.R
  const maxNetBenefit = Math.max(...data.map((d) => d.netBenefit))
  const maxBenefitPoint = data.find((d) => d.netBenefit === maxNetBenefit)

  const chartConfig = {
    netBenefit: { label: '净收益', color: 'var(--chart-2)' },
    savedRevenue: { label: '挽回收益', color: 'var(--chart-1)' },
    powderCost: { label: '粉剂成本', color: 'var(--destructive)' },
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-primary" />
            成本效益分析
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">
            不同遮阳率下的收益与成本
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="Rlabel"
                stroke="var(--muted-foreground)"
                fontSize={10}
                interval={6}
                label={{ value: '遮阳率 R', position: 'insideBottom', offset: -2, fontSize: 11 }}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickFormatter={(v) => `¥${Math.round(v / 1000)}k`}
                label={{ value: '元', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <ChartTooltip
                cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 3' }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-semibold tabular-nums">¥{Number(value).toFixed(0)}</span>
                      </div>
                    )}
                    labelFormatter={(label) => {
                      const item = data.find((d) => d.Rlabel === label)
                      return item ? `R = ${label} ${item.profitable ? '✓' : '✗'}` : label
                    }}
                  />
                }
              />
              {/* 零线 */}
              <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="2 2" />

              {/* 挽回收益（面积） */}
              <Area
                type="monotone"
                dataKey="savedRevenue"
                name="挽回收益"
                fill="var(--chart-1)"
                fillOpacity={0.15}
                stroke="var(--chart-1)"
                strokeWidth={1.5}
              />
              {/* 粉剂成本（线） */}
              <Line
                type="monotone"
                dataKey="powderCost"
                name="粉剂成本"
                stroke="var(--destructive)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
              {/* 净收益（主线） */}
              <Line
                type="monotone"
                dataKey="netBenefit"
                name="净收益"
                stroke="var(--chart-2)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: 'var(--chart-2)', stroke: 'var(--background)', strokeWidth: 2 }}
              />
              {/* 最优点标记 */}
              {optR != null && (
                <ReferenceLine
                  x={`${(optR * 100).toFixed(0)}%`}
                  stroke="var(--primary)"
                  strokeDasharray="2 4"
                  strokeOpacity={0.4}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* 摘要 */}
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
          <div className="rounded bg-muted/30 p-1.5 text-center">
            <div className="text-[10px] text-muted-foreground">最优 R 净收益</div>
            <div className="font-bold tabular-nums text-primary">
              {optR != null ? `¥${data.find((d) => Math.abs(d.R - optR) < 0.005)?.netBenefit.toFixed(0) ?? '--'}` : '--'}
            </div>
          </div>
          <div className="rounded bg-muted/30 p-1.5 text-center">
            <div className="text-[10px] text-muted-foreground">最大净收益</div>
            <div className="font-bold tabular-nums text-chart-2">
              ¥{maxNetBenefit.toFixed(0)}
            </div>
          </div>
          <div className="rounded bg-muted/30 p-1.5 text-center">
            <div className="text-[10px] text-muted-foreground">最大收益 R</div>
            <div className="font-bold tabular-nums">
              {maxBenefitPoint ? `${(maxBenefitPoint.R * 100).toFixed(0)}%` : '--'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
