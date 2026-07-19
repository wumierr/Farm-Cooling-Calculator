'use client'

import * as React from 'react'
import { CalendarDays, Plus, Trash2, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useCalculatorStore } from './store'
import { appendMultiDayHistory } from './history-dialog'
import {
  calcMultiDay, findOptimalMultiDayR, generateDefaultWeek,
} from '@/lib/calculator/multi-day'
import type { DayWeather } from '@/lib/calculator/multi-day'
import { PRESETS } from '@/lib/calculator'
import type { PresetKey } from '@/lib/calculator'
import { cn } from '@/lib/utils'

export function MultiDayDialog() {
  const { params, activePreset } = useCalculatorStore()
  const [open, setOpen] = React.useState(false)
  const [weather, setWeather] = React.useState<DayWeather[]>([])
  const [selectedR, setSelectedR] = React.useState<number>(0.3)
  const [lastRecordKey, setLastRecordKey] = React.useState('')

  // 初始化默认 7 天天气（基于当前参数）
  React.useEffect(() => {
    if (open && weather.length === 0) {
      setWeather(generateDefaultWeek({
        Tmax: params.Tmax, Tmin: params.Tmin, D: params.D,
        Imax: params.Imax, RH: params.RH,
      }))
    }
  }, [open, weather.length, params.Tmax, params.Tmin, params.D, params.Imax, params.RH])

  const updateDay = (idx: number, field: keyof DayWeather, value: number | string) => {
    setWeather((w) => w.map((d, i) => (i === idx ? { ...d, [field]: value } : d)))
  }
  const addDay = () => {
    const last = weather[weather.length - 1]
    if (!last) return
    const d = new Date()
    d.setDate(d.getDate() + weather.length)
    setWeather([...weather, {
      ...last,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    }])
  }
  const deleteDay = (idx: number) => {
    setWeather(weather.filter((_, i) => i !== idx))
  }

  // 计算
  const result = React.useMemo(() => {
    if (weather.length === 0) return null
    return calcMultiDay(weather, selectedR, params)
  }, [weather, selectedR, params])

  // 搜索最优 R
  const optimal = React.useMemo(() => {
    if (weather.length === 0) return null
    return findOptimalMultiDayR(weather, params)
  }, [weather, params])

  // 记录多日计算到历史（仅 open + 有结果时，去重）
  React.useEffect(() => {
    if (!open || !result || result.error) return
    const key = `${selectedR}_${weather.length}_${result.totalHHA}_${result.overHeatDays}`
    if (key === lastRecordKey) return
    setLastRecordKey(key)
    const presetName = activePreset !== 'custom'
      ? PRESETS[activePreset as Exclude<PresetKey, 'custom'>].name
      : '自定义'
    appendMultiDayHistory({
      type: 'multi-day',
      preset: activePreset,
      presetName,
      params: JSON.parse(JSON.stringify(params)),
      optimum: null,
      summary: {
        R: selectedR,
        Y: result.avgY,
        Tmax_cooled: result.days[0]?.Tmax_cooled ?? 0,
        deltaT: result.days[0]?.deltaT ?? 0,
        L: result.cumulativeLoss,
        netBenefit: result.benefit.savedRevenue - (result.days[0]?.deltaT ?? 0) * 0, // 多日无单次成本
      },
      multiDay: {
        days: result.days.length,
        totalHHA: result.totalHHA,
        cumulativeLoss: result.cumulativeLoss,
        overHeatDays: result.overHeatDays,
        savedRevenue: result.benefit.savedRevenue,
      },
    })
  }, [open, result, selectedR, weather.length, activePreset, params, lastRecordKey])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">多日预报</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            多日预报批量分析
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            输入未来 N 天天气预报，计算累积 HHA、累积产量损失与最优喷洒策略
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-4">
          <div className="space-y-4">
            {/* 天气输入表 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">逐日天气预报</Label>
                <Button size="sm" variant="outline" className="h-7" onClick={addDay}>
                  <Plus className="h-3 w-3 mr-1" /> 添加一天
                </Button>
              </div>
              <div className="rounded-md border overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-1.5 w-16">日期</TableHead>
                      <TableHead className="text-right py-1.5">Tmax</TableHead>
                      <TableHead className="text-right py-1.5">Tmin</TableHead>
                      <TableHead className="text-right py-1.5">D</TableHead>
                      <TableHead className="text-right py-1.5">Imax</TableHead>
                      <TableHead className="text-right py-1.5">RH</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weather.map((d, i) => (
                      <TableRow key={i} className="text-xs">
                        <TableCell className="py-1">
                          <Input
                            value={d.label} onChange={(e) => updateDay(i, 'label', e.target.value)}
                            className="h-7 text-xs px-1 w-14"
                          />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input type="number" value={d.Tmax} step={0.5}
                            onChange={(e) => updateDay(i, 'Tmax', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs text-center tabular-nums px-1" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input type="number" value={d.Tmin} step={0.5}
                            onChange={(e) => updateDay(i, 'Tmin', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs text-center tabular-nums px-1" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input type="number" value={d.D} step={0.5}
                            onChange={(e) => updateDay(i, 'D', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs text-center tabular-nums px-1 w-14" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input type="number" value={d.Imax} step={10}
                            onChange={(e) => updateDay(i, 'Imax', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs text-center tabular-nums px-1 w-20" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input type="number" value={d.RH} step={1}
                            onChange={(e) => updateDay(i, 'RH', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs text-center tabular-nums px-1 w-14" />
                        </TableCell>
                        <TableCell className="py-1 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => deleteDay(i)} disabled={weather.length <= 1}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* R 选择器 */}
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <Label className="text-sm font-medium whitespace-nowrap">遮阳率 R</Label>
              <input
                type="range" min={0.1} max={0.8} step={0.01}
                value={selectedR}
                onChange={(e) => setSelectedR(parseFloat(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-bold tabular-nums w-12 text-right">
                {(selectedR * 100).toFixed(0)}%
              </span>
              {optimal && 'R' in optimal && (
                <Button
                  size="sm" variant="outline" className="h-7"
                  onClick={() => setSelectedR(optimal.R)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  最优 {(optimal.R * 100).toFixed(0)}%
                </Button>
              )}
            </div>

            {/* 汇总结果 */}
            {result && !result.error && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-md border p-2.5 text-center bg-card">
                    <div className="text-[10px] text-muted-foreground">累积 HHA</div>
                    <div className="text-lg font-bold tabular-nums">
                      {result.totalHHA.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      基准 {result.baseline.totalHHA.toFixed(0)}
                    </div>
                  </div>
                  <div className="rounded-md border p-2.5 text-center bg-card">
                    <div className="text-[10px] text-muted-foreground">累积损失率</div>
                    <div className={cn('text-lg font-bold tabular-nums', result.cumulativeLoss > 0.2 ? 'text-destructive' : 'text-primary')}>
                      {(result.cumulativeLoss * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      基准 {(result.baseline.cumulativeLoss * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-md border p-2.5 text-center bg-card">
                    <div className="text-[10px] text-muted-foreground">平均 Y</div>
                    <div className="text-lg font-bold tabular-nums">
                      {result.avgY.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      基准 {result.baseline.avgY.toFixed(3)}
                    </div>
                  </div>
                  <div className="rounded-md border p-2.5 text-center bg-card">
                    <div className="text-[10px] text-muted-foreground">超温天数</div>
                    <div className={cn('text-lg font-bold tabular-nums', result.overHeatDays > 0 ? 'text-destructive' : 'text-primary')}>
                      {result.overHeatDays}/{result.days.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      基准 {result.baseline.overHeatDays}
                    </div>
                  </div>
                </div>

                {/* 减损收益 */}
                <div className={cn(
                  'rounded-md border p-3 text-sm',
                  result.benefit.savedRevenue > 0
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-muted',
                )}>
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    相对不施用的减损收益
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">损失率下降</div>
                      <div className="font-semibold tabular-nums text-primary">
                        −{result.benefit.savedLossPct.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">挽回产量</div>
                      <div className="font-semibold tabular-nums">
                        {result.benefit.savedYieldKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">挽回收益</div>
                      <div className="font-semibold tabular-nums text-primary">
                        ¥{result.benefit.savedRevenue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 逐日详情 */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">逐日详情</Label>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="py-1.5">日期</TableHead>
                          <TableHead className="text-right py-1.5">棚温</TableHead>
                          <TableHead className="text-right py-1.5">降温</TableHead>
                          <TableHead className="text-right py-1.5">HHA</TableHead>
                          <TableHead className="text-right py-1.5">损失率</TableHead>
                          <TableHead className="text-right py-1.5">A_rel</TableHead>
                          <TableHead className="text-right py-1.5">Y</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.days.map((d, i) => (
                          <TableRow key={i} className="text-xs">
                            <TableCell className="py-1.5 font-medium">{d.label}</TableCell>
                            <TableCell className={cn(
                              'text-right py-1.5 tabular-nums',
                              d.Tmax_cooled > params.T0 && 'text-destructive font-medium',
                            )}>
                              {d.Tmax_cooled}°C
                            </TableCell>
                            <TableCell className="text-right py-1.5 tabular-nums text-muted-foreground">
                              −{d.deltaT}°C
                            </TableCell>
                            <TableCell className="text-right py-1.5 tabular-nums">{d.HHA.toFixed(0)}</TableCell>
                            <TableCell className="text-right py-1.5 tabular-nums">
                              {(d.dailyLoss * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right py-1.5 tabular-nums">
                              {(d.A_rel * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell className="text-right py-1.5 tabular-nums font-medium">
                              {d.Y.toFixed(3)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {result.overHeatDays > 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      {result.overHeatDays} 天棚温超过 T₀({params.T0}°C)，建议提高遮阳率或结合物理降温措施。
                    </span>
                  </div>
                )}
              </>
            )}

            {result?.error && (
              <div className="text-sm text-destructive text-center py-4">{result.error}</div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
