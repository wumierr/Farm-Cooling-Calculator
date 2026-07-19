'use client'

import * as React from 'react'
import { History, RotateCcw, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useCalculatorStore } from './store'
import { PRESETS } from '@/lib/calculator'
import type { CalcParams, PresetKey, ResultPoint } from '@/lib/calculator'

interface HistoryEntry {
  id: string
  timestamp: number
  preset: PresetKey
  presetName: string
  params: CalcParams
  optimum: ResultPoint | null
  summary: {
    R: number
    Y: number
    Tmax_cooled: number
    deltaT: number
    netBenefit: number | null
  }
}

const HISTORY_KEY = 'gcc:history:v1'
const MAX_HISTORY = 12

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  } catch (e) {
    console.warn('save history failed', e)
  }
}

/** 历史记录管理 — 自动记录每次"有意义"的计算结果 */
export function HistoryDialog() {
  const { params, activePreset, output, costBenefit, loadParams } = useCalculatorStore()
  const [open, setOpen] = React.useState(false)
  const [history, setHistory] = React.useState<HistoryEntry[]>([])
  const [lastSnapKey, setLastSnapKey] = React.useState('')

  // 自动记录：当最优 R 或关键参数变化时，存一条快照
  React.useEffect(() => {
    if (!output?.optimum) return
    const opt = output.optimum
    const key = `${opt.R.toFixed(2)}_${params.Tmax}_${params.activePreset}_${params.calcMode}`
    if (key === lastSnapKey) return
    setLastSnapKey(key)

    const presetName = activePreset !== 'custom'
      ? PRESETS[activePreset as Exclude<PresetKey, 'custom'>].name
      : '自定义'
    const entry: HistoryEntry = {
      id: `h_${Date.now()}`,
      timestamp: Date.now(),
      preset: activePreset,
      presetName,
      params: JSON.parse(JSON.stringify(params)),
      optimum: opt,
      summary: {
        R: opt.R,
        Y: opt.Y,
        Tmax_cooled: opt.Tmax_cooled,
        deltaT: opt.deltaT,
        netBenefit: costBenefit?.netBenefit ?? null,
      },
    }
    // 去重：若最近一条参数完全相同则不重复记录
    setHistory((prev) => {
      const last = prev[0]
      if (last && JSON.stringify(last.summary) === JSON.stringify(entry.summary)
          && last.preset === entry.preset) {
        return prev // 不重复
      }
      const next = [entry, ...prev].slice(0, MAX_HISTORY)
      saveHistory(next)
      return next
    })
  }, [output?.optimum, params, activePreset, costBenefit?.netBenefit, lastSnapKey])

  React.useEffect(() => {
    if (open) setHistory(loadHistory())
  }, [open])

  const handleRestore = (entry: HistoryEntry) => {
    loadParams(entry.params, entry.preset)
    toast.success(`已回溯到 ${entry.presetName} · R=${(entry.summary.R * 100).toFixed(0)}%`)
    setOpen(false)
  }

  const handleDelete = (id: string) => {
    const next = history.filter((h) => h.id !== id)
    saveHistory(next)
    setHistory(next)
  }

  const handleClear = () => {
    saveHistory([])
    setHistory([])
  }

  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    const now = Date.now()
    const diff = now - ts
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">历史</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              计算历史
            </span>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={handleClear}>
                <Trash2 className="h-3 w-3 mr-1" /> 清空
              </Button>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            点击任意记录可回溯参数与结果（最多保留 12 条）
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              暂无历史记录
              <p className="text-xs mt-1">修改参数计算后会自动记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="group rounded-md border p-3 hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => handleRestore(h)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] py-0">{h.presetName}</Badge>
                      <span className="text-[10px] text-muted-foreground">{fmtTime(h.timestamp)}</span>
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(h.id) }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground">R</div>
                      <div className="font-bold tabular-nums text-primary">{(h.summary.R * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Y</div>
                      <div className="font-semibold tabular-nums">{h.summary.Y.toFixed(3)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">棚温</div>
                      <div className="font-semibold tabular-nums">{h.summary.Tmax_cooled}°C</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">净收益</div>
                      <div className={`font-semibold tabular-nums ${(h.summary.netBenefit ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {h.summary.netBenefit != null ? `¥${h.summary.netBenefit.toFixed(0)}` : '--'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                    <span>Tmax {h.params.Tmax}°C</span>
                    <span>·</span>
                    <span>{h.params.calcMode === 'table' ? '表格' : 'k值'}模式</span>
                    <span>·</span>
                    <span>{h.params.sprayArea} 亩</span>
                    <RotateCcw className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-60" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
