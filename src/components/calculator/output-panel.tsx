'use client'

import * as React from 'react'
import {
  AlertTriangle, Info, AlertCircle, TrendingUp, TrendingDown,
  Coins, Package, Droplets, SprayCan, ThermometerSun, Leaf,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
/* Separator removed — use TableRow divider instead (hydration-safe) */
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useCalculatorStore } from './store'
import { ResultChart } from './result-chart'
import { CostBenefitChart } from './cost-benefit-chart'
import { STRATEGY_DEFS } from '@/lib/calculator'
import type { Warning } from '@/lib/calculator'
import { cn } from '@/lib/utils'

/* ── 警告条 ── */
function Warnings({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null
  const icon = (level: Warning['level']) => {
    if (level === 'danger') return <AlertCircle className="h-4 w-4 text-destructive" />
    if (level === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />
    return <Info className="h-4 w-4 text-sky-500" />
  }
  const bg = (level: Warning['level']) => {
    if (level === 'danger') return 'border-destructive/30 bg-destructive/5'
    if (level === 'warning') return 'border-amber-500/30 bg-amber-500/5'
    return 'border-sky-500/30 bg-sky-500/5'
  }
  return (
    <div className="space-y-1.5">
      {warnings.map((w, i) => (
        <div key={i} className={cn('flex items-start gap-2 rounded-md border px-3 py-2 text-xs', bg(w.level))}>
          {icon(w.level)}
          <span className="flex-1">{w.text}</span>
        </div>
      ))}
    </div>
  )
}

/* ── 最优结果卡片 ── */
function OptimumCard() {
  const { output, advice, params, plateau } = useCalculatorStore()
  if (!output?.optimum) return null
  const opt = output.optimum
  const isSpectrum = params.calcMode === 'table' && params.tableSubMode === 'spectral'
  const displayR = isSpectrum && opt.S_total != null ? opt.S_total : opt.R
  const hasPlateau = plateau && Math.abs(plateau.rMax - plateau.rMin) > 0.005

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-accent/40 to-accent/10 animate-fade-in">
      <CardContent className="pt-5 text-center">
        <div className="text-xs text-muted-foreground mb-1">
          {isSpectrum ? '最优总遮阳率 S_total' : '最优遮阳率 S_opt'}
        </div>
        <div className="text-5xl font-extrabold text-primary tabular-nums leading-none">
          {(displayR * 100).toFixed(0)}<span className="text-2xl">%</span>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div>
            <div className="text-xl font-bold tabular-nums">{opt.Y.toFixed(4)}</div>
            <div className="text-[11px] text-muted-foreground">综合效益 Y</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">{opt.Tmax_cooled}°C</div>
            <div className="text-[11px] text-muted-foreground">棚内最高温</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">−{opt.deltaT}°C</div>
            <div className="text-[11px] text-muted-foreground">降温幅度</div>
          </div>
        </div>

        {advice && (
          <div className={cn(
            'mt-4 rounded-md px-4 py-2.5 text-sm font-semibold text-left',
            advice.status === 'ok' ? 'bg-card border border-primary/20 text-primary' : 'bg-destructive/10 text-destructive',
          )}>
            {advice.value}
          </div>
        )}

        {hasPlateau && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs flex-wrap">
            <Badge variant="outline" className="bg-accent/50">近优区间</Badge>
            <span className="font-semibold text-primary tabular-nums">
              {(plateau!.rMin * 100).toFixed(0)}% – {(plateau!.rMax * 100).toFixed(0)}%
            </span>
            <span className="text-muted-foreground">下限省钱 · 上限保安全</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── 策略对比表（Diff Grid 模式） ── */

/** 指标元数据 — 参考原版 METRICS_META */
const METRICS_META: Array<{
  key: keyof import('@/lib/calculator').ResultPoint
  label: string
  higherIsBetter: boolean | null
  fmt: (v: number) => string
  diffFmt?: (v: number) => string
}> = [
  { key: 'R', label: '遮阳率', higherIsBetter: null, fmt: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'Y', label: '综合效益', higherIsBetter: true, fmt: (v) => v.toFixed(4), diffFmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(4) },
  { key: 'A_rel', label: '光合保留率', higherIsBetter: true, fmt: (v) => `${(v * 100).toFixed(1)}%`, diffFmt: (v) => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%' },
  { key: 'L', label: '产量损失率', higherIsBetter: false, fmt: (v) => `${(v * 100).toFixed(1)}%`, diffFmt: (v) => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%' },
  { key: 'HHA', label: '有害积热', higherIsBetter: false, fmt: (v) => v.toFixed(1), diffFmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(1) },
  { key: 'Tmax_cooled', label: '棚内最高温', higherIsBetter: false, fmt: (v) => `${v}°C`, diffFmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(1) + '°C' },
  { key: 'deltaT', label: '降温幅度', higherIsBetter: true, fmt: (v) => `${v}°C`, diffFmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(1) + '°C' },
]

/** Diff 徽章 — 绿色=更好，红色=更差，--=相同 */
function DiffBadge({ baseVal, curVal, higherIsBetter, diffFmt }: {
  baseVal: number
  curVal: number
  higherIsBetter: boolean | null
  diffFmt?: (v: number) => string
}) {
  if (higherIsBetter == null) return null
  const diff = curVal - baseVal
  if (Math.abs(diff) < 0.0001) {
    return <span className="text-[9px] text-muted-foreground/60 ml-1">--</span>
  }
  const isGood = (diff > 0 && higherIsBetter) || (diff < 0 && !higherIsBetter)
  return (
    <span className={cn(
      'text-[9px] font-medium ml-1 px-1 rounded tabular-nums',
      isGood ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10',
    )}>
      {diffFmt ? diffFmt(diff) : (diff > 0 ? '+' : '') + diff.toFixed(3)}
    </span>
  )
}

/** 为任意 R 计算配比建议（表格/k 值模式通用） */
function getAdviceForR(R: number, params: import('@/lib/calculator').CalcParams): {
  ratio: string; powderKg: number; waterL: number; isEstimate: boolean
} | null {
  const totalM2 = params.sprayArea * 666.67
  if (params.calcMode === 'table') {
    const sorted = [...params.productTable].sort((a, b) => a.reflectancePercent - b.reflectancePercent)
    if (sorted.length < 2) return null
    const rMin = sorted[0].reflectancePercent / 100
    const rMax = sorted[sorted.length - 1].reflectancePercent / 100
    if (R < rMin || R > rMax) return null
    let lo = sorted[0], hi = sorted[sorted.length - 1]
    for (let i = 0; i < sorted.length - 1; i++) {
      const rl = sorted[i].reflectancePercent / 100
      const rh = sorted[i + 1].reflectancePercent / 100
      if (R >= rl && R <= rh) { lo = sorted[i]; hi = sorted[i + 1]; break }
    }
    const rl = lo.reflectancePercent / 100, rh = hi.reflectancePercent / 100
    const t = Math.abs(rh - rl) < 1e-9 ? 0 : (R - rl) / (rh - rl)
    const ratioN = lo.ratioN + t * (hi.ratioN - lo.ratioN)
    const coverage = lo.coverage + t * (hi.coverage - lo.coverage)
    const powderKg = totalM2 / coverage
    return { ratio: `1:${ratioN.toFixed(1)}`, powderKg, waterL: powderKg * ratioN, isEstimate: false }
  } else {
    if (params.kMapping.length < 2) return null
    const sorted = [...params.kMapping].sort((a, b) => a.r - b.r)
    if (R < sorted[0].r || R > sorted[sorted.length - 1].r) return null
    let lo = sorted[0], hi = sorted[sorted.length - 1]
    for (let i = 0; i < sorted.length - 1; i++) {
      if (R >= sorted[i].r && R <= sorted[i + 1].r) { lo = sorted[i]; hi = sorted[i + 1]; break }
    }
    const ratio = Math.abs(hi.r - lo.r) < 1e-9 ? lo.ratio : lo.ratio + (R - lo.r) / (hi.r - lo.r) * (hi.ratio - lo.ratio)
    const ri = Math.max(1, Math.min(20, ratio))
    const covMap = [{ r: 1, c: 100 }, { r: 3, c: 250 }, { r: 5, c: 400 }, { r: 8, c: 500 }, { r: 12, c: 750 }, { r: 15, c: 900 }, { r: 20, c: 1200 }]
    let clo = covMap[0], chi = covMap[covMap.length - 1]
    for (let i = 0; i < covMap.length - 1; i++) {
      if (ri >= covMap[i].r && ri <= covMap[i + 1].r) { clo = covMap[i]; chi = covMap[i + 1]; break }
    }
    const coverage = clo.c + (ri - clo.r) / (chi.r - clo.r) * (chi.c - clo.c)
    const powderKg = totalM2 / coverage
    return { ratio: `1:${ratio.toFixed(1)}`, powderKg, waterL: powderKg * ratio, isEstimate: true }
  }
}

function StrategyComparison() {
  const { strategies, params, removeCustomStrategy } = useCalculatorStore()
  const [baseStrategyId, setBaseStrategyId] = React.useState<string>('safe_save')
  const [expanded, setExpanded] = React.useState<string | null>(null)

  if (strategies.length <= 1) return null

  // 基准策略：优先用选中的，否则取第一个
  const base = strategies.find((s) => s.id === baseStrategyId) ?? strategies[0]
  const N = strategies.length

  // 配比建议行（兑水比/粉剂/成本）的元数据
  const adviceRows: Array<{
    label: string
    getValue: (s: typeof strategies[0]) => { text: string; num: number | null; higherIsBetter: boolean | null }
  }> = [
    {
      label: '兑水比',
      getValue: (s) => {
        const a = getAdviceForR(s.data.R, params)
        return { text: a?.ratio ?? '--', num: null, higherIsBetter: null }
      },
    },
    {
      label: '总粉剂用量',
      getValue: (s) => {
        const a = getAdviceForR(s.data.R, params)
        const kg = a?.powderKg ?? null
        return { text: kg != null ? `${kg.toFixed(1)} kg${a?.isEstimate ? ' (估)' : ''}` : '--', num: kg, higherIsBetter: false }
      },
    },
    {
      label: '预计总成本',
      getValue: (s) => {
        const a = getAdviceForR(s.data.R, params)
        const cost = a?.powderKg != null ? a.powderKg * (params.powderPrice || 0) : null
        return { text: cost != null ? `¥${cost.toFixed(2)}` : '--', num: cost, higherIsBetter: false }
      },
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>策略对比</span>
          <span className="text-[11px] font-normal text-muted-foreground">
            {N} 个策略 · 基准: {base.name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* 横向滚动容器，避免窄屏挤压 */}
        <div className="overflow-x-auto scrollbar-thin -mx-1 px-1">
          <div
            className="grid gap-px min-w-full"
            style={{ gridTemplateColumns: `110px repeat(${N}, minmax(110px, 1fr))` }}
          >
            {/* Header row: 策略名 + 设为基准/删除 */}
            <div className="text-[10px] text-muted-foreground font-medium py-1.5 px-2 bg-muted/30 rounded-l">指标</div>
            {strategies.map((s) => {
              const isBase = s.id === base.id
              const isCustom = s.type === 'custom'
              return (
                <div
                  key={s.id}
                  className={cn(
                    'text-[11px] font-semibold py-1.5 px-2 flex items-center gap-1 flex-wrap',
                    isBase ? 'bg-primary/10 text-primary' : 'bg-muted/20',
                    N === strategies.length && 'rounded-r',
                  )}
                >
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.name}</span>
                  {isBase && <span className="text-[8px] bg-primary text-primary-foreground px-1 rounded">基准</span>}
                  {!isBase && (
                    <button
                      onClick={() => setBaseStrategyId(s.id)}
                      className="text-[9px] text-sky-600 hover:text-sky-700 hover:underline ml-auto shrink-0"
                    >
                      设为基准
                    </button>
                  )}
                  {isCustom && (
                    <button
                      onClick={() => removeCustomStrategy(s.data.R)}
                      className="text-[9px] text-destructive hover:text-destructive/70 ml-auto shrink-0"
                      title="移除自定义点"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}

            {/* 数据指标行 */}
            {METRICS_META.map((meta) => (
              <React.Fragment key={meta.key}>
                <div className="text-[11px] text-muted-foreground py-1.5 px-2 bg-muted/10">{meta.label}</div>
                {strategies.map((s) => {
                  const isBase = s.id === base.id
                  const val = s.data[meta.key] as number
                  const baseVal = base.data[meta.key] as number
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        'text-[11px] py-1.5 px-2 tabular-nums flex items-center justify-end',
                        isBase ? 'bg-primary/5 font-medium' : 'bg-card',
                      )}
                    >
                      <span>{meta.fmt(val)}</span>
                      {!isBase && (
                        <DiffBadge
                          baseVal={baseVal}
                          curVal={val}
                          higherIsBetter={meta.higherIsBetter}
                          diffFmt={meta.diffFmt}
                        />
                      )}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}

            {/* 配比建议行 */}
            {adviceRows.map((row) => (
              <React.Fragment key={row.label}>
                <div className="text-[11px] text-muted-foreground py-1.5 px-2 bg-muted/10">{row.label}</div>
                {strategies.map((s) => {
                  const isBase = s.id === base.id
                  const { text, num, higherIsBetter } = row.getValue(s)
                  const baseResult = row.getValue(base)
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        'text-[11px] py-1.5 px-2 tabular-nums flex items-center justify-end',
                        isBase ? 'bg-primary/5 font-medium' : 'bg-card',
                      )}
                    >
                      <span>{text}</span>
                      {!isBase && num != null && baseResult.num != null && higherIsBetter != null && (
                        <DiffBadge
                          baseVal={baseResult.num}
                          curVal={num}
                          higherIsBetter={higherIsBetter}
                          diffFmt={(d) => (d >= 0 ? '+' : '') + d.toFixed(1)}
                        />
                      )}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}

            {/* 自定义点配比建议展开区 */}
            {strategies.filter((s) => s.type === 'custom').map((s) => {
              const isExpanded = expanded === s.id
              const advice = getAdviceForR(s.data.R, params)
              return (
                <React.Fragment key={`expand-${s.id}`}>
                  <div className="text-[11px] text-muted-foreground py-1.5 px-2 bg-muted/10">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : s.id)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {s.name} 详情
                      <span className="text-[9px]">{isExpanded ? '▾' : '▸'}</span>
                    </button>
                  </div>
                  {strategies.map((s2) => (
                    <div
                      key={s2.id}
                      className={cn(
                        'text-[11px] py-1.5 px-2 bg-card',
                        s2.id === s.id && isExpanded && 'bg-muted/20',
                      )}
                    >
                      {s2.id === s.id && isExpanded && (
                        <div className="space-y-0.5">
                          {advice ? (
                            <>
                              <div className="text-[10px] text-muted-foreground">用水量: <span className="font-semibold tabular-nums text-foreground">{advice.waterL.toFixed(0)} L{advice.isEstimate ? ' (估)' : ''}</span></div>
                              <div className="text-[10px] text-muted-foreground">每 kg 喷洒: <span className="font-semibold tabular-nums text-foreground">{(params.sprayArea * 666.67 / advice.powderKg).toFixed(0)} ㎡/kg</span></div>
                            </>
                          ) : (
                            <div className="text-[10px] text-muted-foreground">R={(s.data.R * 100).toFixed(0)}% 超出产品数据范围</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* 说明 */}
        <p className="text-[10px] text-muted-foreground mt-2">
          <span className="text-primary">绿色</span> = 优于基准 · <span className="text-destructive">红色</span> = 劣于基准 · 点击"设为基准"切换对照
        </p>
      </CardContent>
    </Card>
  )
}

/* ── 详细指标表行 ── */
function DetailRow({ icon, label, value, sub, divider }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string
  divider?: boolean
}) {
  return (
    <TableRow className={divider ? 'text-sm border-t border-border/60' : 'text-sm'}>
      <TableCell className="py-2 text-muted-foreground">
        <span className="inline-flex items-center gap-2">{icon}{label}</span>
      </TableCell>
      <TableCell className="py-2 text-right font-medium tabular-nums">
        {value}
        {sub && <span className="text-[10px] text-muted-foreground ml-1">{sub}</span>}
      </TableCell>
    </TableRow>
  )
}

/* ── 带进度条的指标行（A_rel / L 等百分比指标） ── */
function DetailRowWithBar({ icon, label, value, ratio, color, divider }: {
  icon: React.ReactNode; label: string; value: string
  ratio: number // 0-1
  color: string // tailwind color class or css var
  divider?: boolean
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100
  return (
    <TableRow className={divider ? 'text-sm border-t border-border/60' : 'text-sm'}>
      <TableCell className="py-2 text-muted-foreground">
        <span className="inline-flex items-center gap-2">{icon}{label}</span>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex items-center gap-2 justify-end">
          <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <span className="font-medium tabular-nums w-16 text-right">{value}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}

/* ── 详细指标表 ── */
function DetailTable() {
  const { output, advice, params, costBenefit } = useCalculatorStore()
  if (!output?.optimum) return null
  const opt = output.optimum
  const d = advice?.detail
  const bi = advice?.batchInfo

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">作业处方明细</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableBody>
            <DetailRowWithBar icon={<Leaf className="h-3.5 w-3.5" />} label="光合保留率 A_rel"
              value={`${(opt.A_rel * 100).toFixed(1)}%`} ratio={opt.A_rel}
              color="var(--chart-1)" />
            <DetailRow icon={<ThermometerSun className="h-3.5 w-3.5" />} label="有害积热 HHA"
              value={`${opt.HHA.toFixed(1)} °C²·h`} />
            <DetailRowWithBar icon={<TrendingDown className="h-3.5 w-3.5" />} label="产量损失率 L"
              value={`${(opt.L * 100).toFixed(1)}%`} ratio={opt.L}
              color="var(--destructive)" />
            <DetailRow divider icon={<Droplets className="h-3.5 w-3.5" />} label="建议兑水比"
              value={d?.ratio ?? '--'} />
            <DetailRow icon={<SprayCan className="h-3.5 w-3.5" />} label="覆盖能力"
              value={d?.coverage ?? '--'} />
            <DetailRow icon={<Package className="h-3.5 w-3.5" />} label={`总粉剂用量 (${params.sprayArea} 亩)`}
              value={d ? `${d.powderKg.toFixed(1)} kg${d.isEstimate ? ' (估算)' : ''}` : '--'} />
            <DetailRow icon={<Droplets className="h-3.5 w-3.5" />} label={`总用水量 (${params.sprayArea} 亩)`}
              value={d ? `${d.waterL.toFixed(0)} L${d.isEstimate ? ' (估算)' : ''}` : '--'} />
            {bi && (
              <>
                <DetailRow divider icon={<SprayCan className="h-3.5 w-3.5" />} label="分批次数"
                  value={`${bi.batches} 次 (每桶 ${bi.safeCap.toFixed(0)}L)`} />
                <DetailRow icon={<Package className="h-3.5 w-3.5" />} label="每批粉剂"
                  value={`${bi.powderPerBatch.toFixed(2)} kg`} />
                <DetailRow icon={<Droplets className="h-3.5 w-3.5" />} label="每批水量"
                  value={`${bi.waterPerBatch.toFixed(1)} L`} />
              </>
            )}
            <DetailRow divider icon={<Coins className="h-3.5 w-3.5" />} label="粉剂成本"
              value={d ? `¥${(d.powderKg * params.powderPrice).toFixed(2)}` : '--'} />
          </TableBody>
        </Table>

        {/* 净收益分析 */}
        {costBenefit && (
          <div className={cn(
            'mt-3 rounded-md border p-3 space-y-2 text-xs',
            costBenefit.netBenefit >= 0 ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5',
          )}>
            <div className="font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              净收益分析（相对不施用降温剂）
            </div>
            {/* 不施用 vs 施用 对比 */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-muted/40 p-1.5">
                <div className="text-[10px] text-muted-foreground">不施用</div>
                <div className="font-semibold tabular-nums text-destructive">
                  L={(costBenefit.baselineLoss * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  Y={costBenefit.baselineY.toFixed(3)}
                </div>
              </div>
              <div className="flex items-center justify-center text-muted-foreground">
                →
              </div>
              <div className="rounded bg-primary/10 p-1.5">
                <div className="text-[10px] text-muted-foreground">施用后</div>
                <div className="font-semibold tabular-nums text-primary">
                  L={(costBenefit.afterLoss * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  Y={costBenefit.afterY.toFixed(3)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
              <span>挽回产量损失:</span>
              <span className="text-right tabular-nums text-foreground">
                {costBenefit.savedYieldKg.toFixed(1)} kg
                <span className="text-[10px] ml-1">
                  ({((costBenefit.baselineLoss - costBenefit.afterLoss) * 100).toFixed(0)}%)
                </span>
              </span>
              <span>挽回收益:</span>
              <span className="text-right tabular-nums text-foreground">¥{costBenefit.savedRevenue.toFixed(2)}</span>
              <span>粉剂成本:</span>
              <span className="text-right tabular-nums text-foreground">−¥{costBenefit.powderCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t border-border/40">
              <span>净收益:</span>
              <span className={cn('tabular-nums', costBenefit.netBenefit >= 0 ? 'text-primary' : 'text-destructive')}>
                {costBenefit.netBenefit >= 0 ? '+' : ''}¥{costBenefit.netBenefit.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── 策略开关 ── */
function StrategyToggles() {
  const { strategyFlags, toggleStrategy } = useCalculatorStore()
  return (
    <div className="flex flex-wrap gap-4 text-xs">
      <Label className="flex items-center gap-1.5 cursor-pointer">
        <Checkbox checked disabled />
        安全省钱 (基准)
      </Label>
      <Label className="flex items-center gap-1.5 cursor-pointer">
        <Checkbox
          checked={strategyFlags.max_y}
          onCheckedChange={() => toggleStrategy('max_y')}
        />
        最高效益
      </Label>
      <Label className="flex items-center gap-1.5 cursor-pointer">
        <Checkbox
          checked={strategyFlags.absolute_temp}
          onCheckedChange={() => toggleStrategy('absolute_temp')}
        />
        绝对保温度
      </Label>
    </div>
  )
}

/* ── 主输出面板 ── */
export function OutputPanel() {
  const { output, strategyWarnings, envWarnings } = useCalculatorStore()
  const hasError = output?.error

  return (
    <div className="space-y-3">
      <ResultChart />

      <Warnings warnings={envWarnings} />

      <StrategyToggles />

      {hasError ? (
        <Card className="border-destructive/30">
          <CardContent className="pt-5 text-center text-sm text-destructive">
            {output!.error}
          </CardContent>
        </Card>
      ) : (
        <>
          <OptimumCard />
          <Warnings warnings={strategyWarnings} />
          <StrategyComparison />
          <CostBenefitChart />
          <DetailTable />
        </>
      )}
    </div>
  )
}
