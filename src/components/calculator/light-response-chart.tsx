'use client'

import * as React from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine, Brush,
} from 'recharts'
import { Sun, Sparkles, Info } from 'lucide-react'
import { useCalculatorStore } from './store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { computeLightResponse, LIGHT_MODELS } from '@/lib/calculator/light-response'
import type { LightModel, LightResponsePoint } from '@/lib/calculator/light-response'
import { cn } from '@/lib/utils'

export function LightResponseChart() {
  const { params, output } = useCalculatorStore()
  const [model, setModel] = React.useState<LightModel>('saturating')
  const [overlayShaded, setOverlayShaded] = React.useState(true)

  // 当前遮阳率：优先用最优 R，用于叠加"施用后"曲线
  const R = output?.optimum?.R ?? 0

  const result = React.useMemo(
    () => computeLightResponse(
      { LSP: params.LSP, LCP: params.LCP, Imax: params.Imax, D: params.D },
      model,
      R,
    ),
    [params.LSP, params.LCP, params.Imax, params.D, model, R],
  )

  const meta = result.meta
  const peakLabel = React.useMemo(() => {
    if (!result.points.length) return undefined
    return result.points.reduce((a, b) => (b.eff > a.eff ? b : a), result.points[0]).label
  }, [result])

  const chartConfig = {
    eff: { label: '光合效率', color: meta.color },
    effShaded: { label: '施用后', color: 'var(--primary)' },
  }

  const deltaArea = result.integralShaded - result.integral
  const deltaPct = result.integral > 0 ? (deltaArea / result.integral) * 100 : 0
  const xInterval = Math.max(1, Math.floor(result.points.length / 7))
  const showShaded = overlayShaded && R > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-[17px] flex items-center gap-1.5">
          <Sun className="h-4 w-4 text-primary" />
          光照 → 光合转化效率（全天）
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 模型切换 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {LIGHT_MODELS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setModel(m.key)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-all',
                model === m.key
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5',
              )}
              title={m.desc}
            >
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
              {m.name}
              <span className="text-[10px] text-muted-foreground">· {m.shape}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOverlayShaded((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-all ml-auto',
              overlayShaded
                ? 'border-primary/60 bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40',
            )}
            title="叠加施用降温剂后的效率曲线"
          >
            <Sparkles className="h-3 w-3" />
            叠加施用后 {R > 0 ? `(R=${(R * 100).toFixed(0)}%)` : ''}
          </button>
        </div>

        {/* 模型说明 */}
        <p className="text-[11px] text-muted-foreground mb-2 flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{meta.desc}</span>
        </p>

        <ChartContainer config={chartConfig} className="h-[300px] sm:h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={result.points} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
              <defs>
                <linearGradient id="lrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={meta.color} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={11}
                interval={xInterval}
                tickMargin={6}
              />
              <YAxis
                domain={[0, 1]}
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                width={44}
              />
              <ChartTooltip
                offset={30}
                allowEscapeViewBox={{ y: true }}
                cursor={{ stroke: 'var(--primary)', strokeWidth: 1.5, strokeDasharray: '5 3', strokeOpacity: 0.5 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]?.payload as LightResponsePoint | undefined
                  if (!p) return null
                  return (
                    <div className="rounded-lg border border-border/60 bg-popover shadow-xl px-3 py-2 text-xs min-w-[150px]">
                      <div className="font-semibold text-sm border-b border-border/60 pb-1 mb-1.5">{p.label}</div>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">到达 PAR</span>
                          <span className="tabular-nums">{p.PAR} μmol</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">光合效率</span>
                          <span className="tabular-nums font-semibold">{(p.eff * 100).toFixed(0)}%</span>
                        </div>
                        {showShaded && p.effShaded !== p.eff && (
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">施用后</span>
                            <span className="tabular-nums text-primary">{(p.effShaded * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }}
              />
              {peakLabel && (
                <ReferenceLine
                  x={peakLabel}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="2 4"
                  strokeOpacity={0.5}
                  label={{ value: '峰值', position: 'top', fill: 'var(--muted-foreground)', fontSize: 10 }}
                />
              )}
              {/* 积分面积 = 全天累计光合（未遮阳） */}
              <Area
                type="monotone"
                dataKey="eff"
                name="光合效率"
                stroke={meta.color}
                strokeWidth={2.5}
                fill="url(#lrFill)"
                activeDot={{ r: 6, fill: meta.color, stroke: 'var(--background)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {/* 施用降温剂后（叠加，虚线） */}
              {showShaded && (
                <Line
                  type="monotone"
                  dataKey="effShaded"
                  name="施用后"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )}
              <Brush
                dataKey="label"
                height={22}
                travellerWidth={8}
                stroke="var(--primary)"
                fill="var(--muted)"
                tickFormatter={() => ''}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* 摘要 */}
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <SummaryStat label="曲线形态" value={meta.shape} accent />
          <SummaryStat label="峰值效率" value={`${(result.maxEff * 100).toFixed(0)}%`} />
          <SummaryStat label="全天累计效能" value={result.integral.toFixed(2)} hint="效率×时长积分" />
          {showShaded ? (
            <SummaryStat label="施用后累计" value={result.integralShaded.toFixed(2)} delta={deltaPct} />
          ) : (
            <SummaryStat label="峰的个数" value={`${result.peakCount}`} />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          阴影面积 = 全天累计光合（效率沿时间积分）· 拖动底部滑块可缩放时段 · 触摸曲线查看数值
          {showShaded && model === 'photoinhibition' && deltaArea > 0 && (
            <span className="text-primary">　· 遮阳缓解了正午"午休"，全天累计反而上升</span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

/* ── 摘要小卡 ── */
function SummaryStat({ label, value, hint, delta, accent }: {
  label: string
  value: string
  hint?: string
  delta?: number
  accent?: boolean
}) {
  return (
    <div className="rounded-md border bg-card px-2.5 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn('font-semibold tabular-nums', accent && 'text-primary')}>
        {value}
        {delta != null && Math.abs(delta) >= 0.1 && (
          <span className={cn('text-[10px] ml-1', delta >= 0 ? 'text-primary' : 'text-destructive')}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(0)}%
          </span>
        )}
      </div>
      {hint && <div className="text-[9px] text-muted-foreground/70">{hint}</div>}
    </div>
  )
}
