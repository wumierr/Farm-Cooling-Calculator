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
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-accent/40 to-accent/10">
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

/* ── 策略对比表 ── */
function StrategyComparison() {
  const { strategies, params } = useCalculatorStore()
  if (strategies.length <= 1) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">策略对比</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="py-1.5">策略</TableHead>
              <TableHead className="text-right py-1.5">R</TableHead>
              <TableHead className="text-right py-1.5">Y</TableHead>
              <TableHead className="text-right py-1.5">棚温</TableHead>
              <TableHead className="text-right py-1.5">损失率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {strategies.map((s) => (
              <TableRow key={s.id} className="text-xs">
                <TableCell className="py-1.5 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                </TableCell>
                <TableCell className="text-right py-1.5 tabular-nums">{(s.data.R * 100).toFixed(0)}%</TableCell>
                <TableCell className="text-right py-1.5 tabular-nums font-semibold">{s.data.Y.toFixed(4)}</TableCell>
                <TableCell className={cn('text-right py-1.5 tabular-nums', s.data.Tmax_cooled > params.T0 && 'text-destructive font-medium')}>
                  {s.data.Tmax_cooled}°C
                </TableCell>
                <TableCell className="text-right py-1.5 tabular-nums">{(s.data.L * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            <DetailRow icon={<Leaf className="h-3.5 w-3.5" />} label="光合保留率 A_rel"
              value={`${(opt.A_rel * 100).toFixed(2)}%`} />
            <DetailRow icon={<ThermometerSun className="h-3.5 w-3.5" />} label="有害积热 HHA"
              value={`${opt.HHA.toFixed(1)} °C²·h`} />
            <DetailRow icon={<TrendingDown className="h-3.5 w-3.5" />} label="产量损失率 L"
              value={`${(opt.L * 100).toFixed(1)}%`} />
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
            'mt-3 rounded-md border p-3 space-y-1.5 text-xs',
            costBenefit.netBenefit >= 0 ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5',
          )}>
            <div className="font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              净收益分析（相对不施用）
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
            <div className="flex justify-between font-semibold">
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
          <DetailTable />
        </>
      )}
    </div>
  )
}
