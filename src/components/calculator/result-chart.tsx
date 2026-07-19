'use client'

import * as React from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ReferenceDot, ReferenceLine, Legend,
} from 'recharts'
import { MousePointerClick, Trash2 } from 'lucide-react'
import { useCalculatorStore } from './store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import type { ResultPoint } from '@/lib/calculator'

interface ChartDatum extends ResultPoint {
  Rlabel: string
}

export function ResultChart() {
  const {
    output, strategies, plateau,
    setCustomStrategy, removeCustomStrategy, clearCustomStrategies,
  } = useCalculatorStore()

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
        <CardTitle className="text-base sm:text-[17px] flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            综合效益曲线 Y = A_rel × (1 − L)
          </span>
          <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
            {hasPlateau && <span>黄色带 = 近优区间</span>}
            <span className="hidden sm:inline-flex items-center gap-1">
              <MousePointerClick className="h-3 w-3" />
              点击曲线设置对比点
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
              onClick={(e: { activePayload?: Array<{ payload: ChartDatum }> } | null) => {
                // 单点替换模式：点击任意位置直接替换自定义点
                if (e?.activePayload?.[0]?.payload) {
                  const datum = e.activePayload[0].payload
                  setCustomStrategy(datum.R)
                }
              }}
            >
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
                offset={40}
                allowEscapeViewBox={{ y: true }}
                cursor={{
                  stroke: 'var(--primary)',
                  strokeWidth: 1.5,
                  strokeDasharray: '5 3',
                  fill: 'var(--primary)',
                  fillOpacity: 0.06,
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const r = payload[0]?.payload as ChartDatum
                  if (!r) return null
                  return (
                    <div className="rounded-lg border border-border/60 bg-popover shadow-xl px-3 py-2 text-xs min-w-[160px]">
                      <div className="font-semibold text-sm border-b border-border/60 pb-1 mb-1.5">
                        R = {(r.R * 100).toFixed(0)}%
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">综合效益 Y</span>
                          <span className="font-semibold tabular-nums">{r.Y.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">光合保留</span>
                          <span className="tabular-nums" style={{ color: 'var(--chart-1)' }}>
                            {(r.A_rel * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">损失率</span>
                          <span className="tabular-nums" style={{ color: r.L > 0.2 ? 'var(--destructive)' : 'inherit' }}>
                            {(r.L * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">HHA</span>
                          <span className="tabular-nums">{r.HHA.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">棚温</span>
                          <span className="tabular-nums" style={{ color: r.Tmax_cooled > 37 ? 'var(--destructive)' : 'inherit' }}>
                            {r.Tmax_cooled}°C
                          </span>
                        </div>
                        {r.S_total != null && (
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">S_total</span>
                            <span className="tabular-nums">{(r.S_total * 100).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }}
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
                dot={(props) => {
                  const { index } = props
                  // 每 5 个点显示一个小圆点（10%, 15%, 20%... 间隔 5%）
                  if (index % 5 !== 0) return false as unknown as React.ReactElement
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={2}
                      fill="var(--chart-1)"
                      fillOpacity={0.4}
                      stroke="var(--background)"
                      strokeWidth={1}
                    />
                  )
                }}
                activeDot={{
                  r: 7,
                  fill: 'var(--chart-1)',
                  stroke: 'var(--background)',
                  strokeWidth: 2.5,
                  className: 'drop-shadow-sm',
                }}
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
                activeDot={{
                  r: 5,
                  fill: 'var(--chart-3)',
                  stroke: 'var(--background)',
                  strokeWidth: 2,
                }}
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
              {/* 最优点垂直参考线 */}
              {output?.optimum && (
                <ReferenceLine
                  yAxisId="left"
                  x={`${(output.optimum.R * 100).toFixed(0)}%`}
                  stroke="var(--primary)"
                  strokeDasharray="2 4"
                  strokeOpacity={0.4}
                  label={{
                    value: `最优 ${(output.optimum.R * 100).toFixed(0)}%`,
                    position: 'top',
                    fill: 'var(--primary)',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        {/* 图例：曲线 + 策略点说明 */}
        <div className="mt-2 space-y-1.5">
          {/* 曲线图例 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5" style={{ backgroundColor: 'var(--chart-1)' }} />
              <span className="text-muted-foreground">综合效益 Y</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 border-t border-dashed" style={{ borderColor: 'var(--chart-3)' }} />
              <span className="text-muted-foreground">光合保留率 A_rel</span>
            </div>
            {hasPlateau && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--accent)', opacity: 0.5 }} />
                <span className="text-muted-foreground">近优区间</span>
              </div>
            )}
          </div>
          {/* 策略点图例 — 颜色圆点 + 名称 + R 值，让用户区分每个点 */}
          {strategies.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pt-1 border-t border-border/40">
              <span className="text-[10px] text-muted-foreground/70 font-medium">策略点:</span>
              {strategies.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-1 ${s.type === 'custom' ? 'cursor-pointer hover:opacity-70' : ''}`}
                  onClick={() => {
                    if (s.type === 'custom') removeCustomStrategy(s.data.R)
                  }}
                  title={s.type === 'custom' ? '点击移除' : undefined}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full border-2 border-background shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                    R={(s.data.R * 100).toFixed(0)}%
                  </span>
                  {s.type === 'custom' && <Trash2 className="h-3 w-3 text-destructive" />}
                </div>
              ))}
              {strategies.some((s) => s.type === 'custom') && (
                <Button
                  variant="ghost" size="sm" className="h-5 text-[10px] ml-auto px-1.5"
                  onClick={clearCustomStrategies}
                >
                  <Trash2 className="h-2.5 w-2.5 mr-0.5" /> 清除
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
