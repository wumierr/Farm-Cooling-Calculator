'use client'

import * as React from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { GitCompare, Camera, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useCalculatorStore } from './store'
import { PRESETS } from '@/lib/calculator'
import type { CalcParams, PresetKey, ResultPoint } from '@/lib/calculator'
import { cn } from '@/lib/utils'

interface Snapshot {
  id: string
  label: string
  timestamp: number
  params: CalcParams
  preset: PresetKey
  presetName: string
  optimum: ResultPoint | null
  /** 完整结果曲线（用于 A/B 叠加图示） */
  results: ResultPoint[] | null
}

const SNAP_KEY = 'gcc:snapshots:v2'

function loadSnapshots(): { A: Snapshot | null; B: Snapshot | null } {
  try {
    const raw = localStorage.getItem(SNAP_KEY)
    if (!raw) return { A: null, B: null }
    return JSON.parse(raw)
  } catch { return { A: null, B: null } }
}

function saveSnapshots(s: { A: Snapshot | null; B: Snapshot | null }) {
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(s)) } catch {}
}

/** 指标对比行 — 模块级组件，避免 render 内创建 */
function MetricRow({ label, valueA, valueB, fmt, higherIsBetter }: {
  label: string
  valueA: number | null | undefined
  valueB: number | null | undefined
  fmt: (v: number) => string
  higherIsBetter?: boolean
}) {
  const a = valueA ?? 0
  const b = valueB ?? 0
  const diff = b - a
  const aBetter = higherIsBetter ? a > b : a < b
  const bBetter = higherIsBetter ? b > a : b < a
  return (
    <TableRow className="text-xs">
      <TableCell className="py-1.5 text-muted-foreground">{label}</TableCell>
      <TableCell className={cn('py-1.5 text-right tabular-nums font-medium', aBetter && 'text-primary')}>
        {valueA != null ? fmt(a) : '--'}
      </TableCell>
      <TableCell className="py-1.5 text-center text-muted-foreground">
        {(valueA != null && valueB != null && Math.abs(diff) > 0.0001) ? (
          <span className={cn('text-[10px]', diff > 0 ? 'text-primary' : 'text-destructive')}>
            {diff > 0 ? '+' : ''}{fmt(diff)}
          </span>
        ) : '—'}
      </TableCell>
      <TableCell className={cn('py-1.5 text-right tabular-nums font-medium', bBetter && 'text-primary')}>
        {valueB != null ? fmt(b) : '--'}
      </TableCell>
    </TableRow>
  )
}

/** A/B 场景对比 — 快照当前参数到 A 或 B 槽位，对比关键指标差异 */
export function CompareDialog() {
  const { params, activePreset, output, loadParams } = useCalculatorStore()
  const [open, setOpen] = React.useState(false)
  const [snapshots, setSnapshots] = React.useState<{ A: Snapshot | null; B: Snapshot | null }>({ A: null, B: null })

  React.useEffect(() => {
    if (open) setSnapshots(loadSnapshots())
  }, [open])

  const makeSnapshot = (slot: 'A' | 'B'): Snapshot => {
    const presetName = activePreset !== 'custom'
      ? PRESETS[activePreset as Exclude<PresetKey, 'custom'>].name
      : '自定义'
    return {
      id: `${slot}_${Date.now()}`,
      label: `场景 ${slot}`,
      timestamp: Date.now(),
      params: JSON.parse(JSON.stringify(params)),
      preset: activePreset,
      presetName,
      optimum: output?.optimum ?? null,
      results: output?.results ? JSON.parse(JSON.stringify(output.results)) : null,
    }
  }

  const capture = (slot: 'A' | 'B') => {
    const snap = makeSnapshot(slot)
    const next = { ...snapshots, [slot]: snap }
    setSnapshots(next)
    saveSnapshots(next)
    toast.success(`已快照到场景 ${slot}`)
  }

  const restore = (slot: 'A' | 'B') => {
    const snap = snapshots[slot]
    if (!snap) return
    loadParams(snap.params, snap.preset)
    toast.success(`已载入场景 ${slot}`)
    setOpen(false)
  }

  const clearSlot = (slot: 'A' | 'B') => {
    const next = { ...snapshots, [slot]: null }
    setSnapshots(next)
    saveSnapshots(next)
  }

  // 对比指标
  const A = snapshots.A
  const B = snapshots.B
  const canCompare = A?.optimum && B?.optimum

  // A/B 叠加图表数据（合并两条曲线的 Y 值）
  const chartData = React.useMemo(() => {
    if (!A?.results || !B?.results) return []
    const len = Math.min(A.results.length, B.results.length)
    const data: Array<{ Rlabel: string; YA: number | null; YB: number | null }> = []
    for (let i = 0; i < len; i++) {
      const ra = A.results[i]
      const rb = B.results[i]
      if (Math.abs(ra.R - rb.R) > 0.005) continue
      data.push({
        Rlabel: `${(ra.R * 100).toFixed(0)}%`,
        YA: ra.Y,
        YB: rb.Y,
      })
    }
    return data
  }, [A, B])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GitCompare className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">对比</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            A/B 场景对比
          </DialogTitle>
          <DialogDescription className="text-xs">
            快照当前参数到 A 或 B 槽位，对比关键指标差异（可用于比较不同品种/天气/配方的效果）
          </DialogDescription>
        </DialogHeader>

        {/* 快照操作栏 */}
        <div className="grid grid-cols-2 gap-3">
          {(['A', 'B'] as const).map((slot) => {
            const snap = snapshots[slot]
            return (
              <div key={slot} className={cn(
                'rounded-md border p-3 space-y-2',
                snap ? 'border-primary/30 bg-primary/5' : 'border-dashed',
              )}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <Badge variant={snap ? 'default' : 'outline'} className="text-[10px]">{slot}</Badge>
                    {snap ? snap.presetName : '空'}
                  </span>
                  {snap && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => clearSlot(slot)}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {snap?.optimum ? (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground">R</div>
                      <div className="font-bold tabular-nums text-primary">{(snap.optimum.R * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Y</div>
                      <div className="font-semibold tabular-nums">{snap.optimum.Y.toFixed(3)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">棚温</div>
                      <div className="font-semibold tabular-nums">{snap.optimum.Tmax_cooled}°C</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">点击下方按钮快照当前参数</p>
                )}
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => capture(slot)}>
                    <Camera className="h-3 w-3 mr-1" /> 快照
                  </Button>
                  {snap && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => restore(slot)}>
                      载入
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* A/B 曲线叠加图 */}
        {canCompare && chartData.length > 0 && A && B && (
          <div className="rounded-md border p-3 bg-card">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-3">
              <span>Y 曲线叠加对比</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5" style={{ backgroundColor: '#2d6a4f' }} />
                <span className="text-[10px]">A: {A.presetName}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5" style={{ backgroundColor: '#c0392b' }} />
                <span className="text-[10px]">B: {B.presetName}</span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="Rlabel"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  interval={6}
                  label={{ value: '遮阳率 R', position: 'insideBottom', offset: -2, fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 1]}
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  label={{ value: 'Y', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number, name: string) => [
                    Number(value).toFixed(4),
                    name === 'YA' ? `A: ${A.presetName}` : `B: ${B.presetName}`,
                  ]}
                  labelFormatter={(label) => `R = ${label}`}
                />
                {A.optimum && (
                  <ReferenceLine
                    x={`${(A.optimum.R * 100).toFixed(0)}%`}
                    stroke="#2d6a4f"
                    strokeDasharray="2 3"
                    strokeOpacity={0.5}
                  />
                )}
                {B.optimum && (
                  <ReferenceLine
                    x={`${(B.optimum.R * 100).toFixed(0)}%`}
                    stroke="#c0392b"
                    strokeDasharray="2 3"
                    strokeOpacity={0.5}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="YA"
                  stroke="#2d6a4f"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#2d6a4f', stroke: 'var(--background)', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="YB"
                  stroke="#c0392b"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#c0392b', stroke: 'var(--background)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 对比表 */}
        {canCompare && A && B && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="py-1.5">指标</TableHead>
                  <TableHead className="text-right py-1.5">场景 A</TableHead>
                  <TableHead className="text-center py-1.5">差异</TableHead>
                  <TableHead className="text-right py-1.5">场景 B</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <MetricRow label="最优遮阳率 R" valueA={A.optimum?.R} valueB={B.optimum?.R}
                  fmt={(v) => `${(v * 100).toFixed(0)}%`} />
                <MetricRow label="综合效益 Y" valueA={A.optimum?.Y} valueB={B.optimum?.Y}
                  fmt={(v) => v.toFixed(4)} higherIsBetter />
                <MetricRow label="降温后棚温" valueA={A.optimum?.Tmax_cooled} valueB={B.optimum?.Tmax_cooled}
                  fmt={(v) => `${v.toFixed(1)}°C`} />
                <MetricRow label="降温幅度" valueA={A.optimum?.deltaT} valueB={B.optimum?.deltaT}
                  fmt={(v) => `${v.toFixed(1)}°C`} higherIsBetter />
                <MetricRow label="光合保留率" valueA={A.optimum?.A_rel} valueB={B.optimum?.A_rel}
                  fmt={(v) => `${(v * 100).toFixed(1)}%`} higherIsBetter />
                <MetricRow label="产量损失率" valueA={A.optimum?.L} valueB={B.optimum?.L}
                  fmt={(v) => `${(v * 100).toFixed(1)}%`} />
                <MetricRow label="有害积热 HHA" valueA={A.optimum?.HHA} valueB={B.optimum?.HHA}
                  fmt={(v) => v.toFixed(1)} />
                <MetricRow label="Tmax (输入)" valueA={A.params.Tmax} valueB={B.params.Tmax}
                  fmt={(v) => `${v}°C`} />
                <MetricRow label="LSP" valueA={A.params.LSP} valueB={B.params.LSP}
                  fmt={(v) => `${v}`} higherIsBetter />
                <MetricRow label="T₀ 阈值" valueA={A.params.T0} valueB={B.params.T0}
                  fmt={(v) => `${v}°C`} higherIsBetter />
              </TableBody>
            </Table>
          </div>
        )}

        {!canCompare && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <GitCompare className="h-8 w-8 mx-auto mb-2 opacity-40" />
            请快照两个场景以查看对比
            <p className="text-xs mt-1">例如：场景 A 用克瑞森无核 + 盛夏常规，场景 B 用阳光玫瑰 + 高湿闷热</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
