'use client'

import * as React from 'react'
import { History, RotateCcw, Trash2, Clock, Search, Filter, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toast } from 'sonner'
import { useCalculatorStore } from './store'
import { PRESETS } from '@/lib/calculator'
import type { CalcParams, PresetKey, ResultPoint } from '@/lib/calculator'

interface HistoryEntry {
  id: string
  timestamp: number
  type: 'single' | 'multi-day'
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
  /** 多日场景特有字段 */
  multiDay?: {
    days: number
    totalHHA: number
    cumulativeLoss: number
    overHeatDays: number
    savedRevenue: number
  }
}

const HISTORY_KEY = 'gcc:history:v2'
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

/** 全局函数：供 multi-day-dialog 调用记录多日计算结果 */
export function appendMultiDayHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
  const full: HistoryEntry = {
    ...entry,
    id: `h_${Date.now()}`,
    timestamp: Date.now(),
  }
  const existing = loadHistory()
  // 去重：相同 type + summary + preset 不重复
  const last = existing[0]
  if (last && last.type === full.type && last.preset === full.preset
      && JSON.stringify(last.summary) === JSON.stringify(full.summary)
      && JSON.stringify(last.multiDay) === JSON.stringify(full.multiDay)) {
    return
  }
  const next = [full, ...existing].slice(0, MAX_HISTORY)
  saveHistory(next)
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
      type: 'single',
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

  // 导出历史记录
  const exportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: 'v2',
      count: history.length,
      entries: history,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `计算历史_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`已导出 ${history.length} 条记录 (JSON)`)
  }

  const exportCSV = () => {
    const headers = [
      '时间', '类型', '品种', 'R(%)', 'Y', '棚温(°C)', '降温(°C)', '损失率(%)',
      '净收益(元)', 'Tmax', 'Tmin', 'D', 'Imax', 'RH', '面积(亩)', '模式',
    ]
    const rows = history.map((h) => {
      const d = new Date(h.timestamp)
      const time = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      return [
        time,
        h.type === 'multi-day' ? '多日' : '单日',
        h.presetName,
        (h.summary.R * 100).toFixed(0),
        h.summary.Y.toFixed(4),
        h.summary.Tmax_cooled,
        h.summary.deltaT,
        (h.summary.L * 100).toFixed(1),
        h.summary.netBenefit?.toFixed(2) ?? '',
        h.params.Tmax,
        h.params.Tmin,
        h.params.D,
        h.params.Imax,
        h.params.RH,
        h.params.sprayArea,
        h.params.calcMode === 'table' ? '表格' : 'k值',
      ].join(',')
    })
    // 添加 BOM 避免中文乱码
    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `计算历史_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`已导出 ${history.length} 条记录 (CSV)`)
  }

  // 搜索/筛选状态
  const [searchQuery, setSearchQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'single' | 'multi-day'>('all')

  // 过滤后的历史记录
  const filteredHistory = React.useMemo(() => {
    return history.filter((h) => {
      // 类型过滤
      if (typeFilter !== 'all' && h.type !== typeFilter) return false
      // 搜索查询（品种名、R 值、参数）
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const haystack = [
          h.presetName,
          `${(h.summary.R * 100).toFixed(0)}%`,
          `${h.params.Tmax}`,
          `${h.params.sprayArea}`,
          h.params.calcMode === 'table' ? '表格' : 'k值',
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [history, searchQuery, typeFilter])

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
              <Badge variant="secondary" className="text-[10px] py-0 ml-1">
                {history.length}
              </Badge>
            </span>
            {history.length > 0 && (
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <Download className="h-3 w-3 mr-1" /> 导出
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportCSV}>
                      <Download className="h-3 w-3 mr-2" /> CSV (Excel)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportJSON}>
                      <Download className="h-3 w-3 mr-2" /> JSON (完整数据)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={handleClear}>
                  <Trash2 className="h-3 w-3 mr-1" /> 清空
                </Button>
              </div>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            点击任意记录可回溯参数与结果（最多保留 12 条）
          </DialogDescription>
        </DialogHeader>

        {/* 搜索 + 筛选栏 */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 pb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="搜索品种、R 值、参数..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>
            <ToggleGroup
              type="single"
              value={typeFilter}
              onValueChange={(v) => setTypeFilter((v as typeof typeFilter) || 'all')}
              className="rounded-md border bg-card"
            >
              <ToggleGroupItem value="all" className="h-8 px-2 text-xs">全部</ToggleGroupItem>
              <ToggleGroupItem value="single" className="h-8 px-2 text-xs">单日</ToggleGroupItem>
              <ToggleGroupItem value="multi-day" className="h-8 px-2 text-xs">多日</ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        <ScrollArea className="max-h-[60vh] pr-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              暂无历史记录
              <p className="text-xs mt-1">修改参数计算后会自动记录</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
              无匹配记录
              <p className="text-xs mt-1">尝试调整搜索关键词或筛选条件</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((h) => (
                <div
                  key={h.id}
                  className={`group rounded-md border p-3 hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer ${
                    h.type === 'multi-day' ? 'border-sky-500/30 bg-sky-500/5' : ''
                  }`}
                  onClick={() => handleRestore(h)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] py-0">{h.presetName}</Badge>
                      {h.type === 'multi-day' && (
                        <Badge variant="secondary" className="text-[10px] py-0 bg-sky-500/20 text-sky-700 dark:text-sky-300">
                          多日 {h.multiDay?.days}天
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">{fmtTime(h.timestamp)}</span>
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(h.id) }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {h.type === 'multi-day' && h.multiDay ? (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] text-muted-foreground">R</div>
                        <div className="font-bold tabular-nums text-primary">{(h.summary.R * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">累积HHA</div>
                        <div className="font-semibold tabular-nums">{h.multiDay.totalHHA.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">超温</div>
                        <div className={`font-semibold tabular-nums ${h.multiDay.overHeatDays > 0 ? 'text-destructive' : 'text-primary'}`}>
                          {h.multiDay.overHeatDays}/{h.multiDay.days}天
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">挽回收益</div>
                        <div className="font-semibold tabular-nums text-primary">¥{h.multiDay.savedRevenue.toFixed(0)}</div>
                      </div>
                    </div>
                  ) : (
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
                  )}
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
