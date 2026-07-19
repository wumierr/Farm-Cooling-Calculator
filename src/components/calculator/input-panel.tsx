'use client'

import * as React from 'react'
import { Plus, Trash2, RotateCcw, FlaskConical, Sun, Droplets, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { useCalculatorStore } from './store'
import { PRESETS } from '@/lib/calculator'
import type { PresetKey, ProductRow, KMappingRow, SpectrumPoint, CalcParams } from '@/lib/calculator'
import { cn } from '@/lib/utils'

/* ── 通用数字输入行 ── */
function NumField({
  id, label, value, onChange, unit, step, min, max, invalid, hint,
}: {
  id: string
  label: React.ReactNode
  value: number
  onChange: (v: number) => void
  unit?: string
  step?: number
  min?: number
  max?: number
  invalid?: boolean
  hint?: string
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 items-center py-1">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-xs text-muted-foreground truncate block">
          {label}
        </Label>
        {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          type="number"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            onChange(Number.isFinite(v) ? v : NaN)
          }}
          className={cn(
            'w-24 h-8 text-sm text-right tabular-nums',
            invalid && 'border-destructive focus-visible:ring-destructive',
          )}
        />
        {unit && <span className="text-[11px] text-muted-foreground w-12 whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  )
}

/* ── 品种预设 ── */
function PresetSelector() {
  const { activePreset, applyPreset } = useCalculatorStore()
  const presets: { key: PresetKey; name: string }[] = [
    { key: 'crimson', name: '克瑞森无核' },
    { key: 'summer-black', name: '夏黑' },
    { key: 'shine-muscat', name: '阳光玫瑰' },
    { key: 'kyoho', name: '巨峰' },
    { key: 'red-globe', name: '红地球' },
    { key: 'custom', name: '自定义' },
  ]
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs font-semibold text-muted-foreground mb-2">品种预设</div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={activePreset === p.key ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => applyPreset(p.key)}
            >
              {p.name}
            </Button>
          ))}
        </div>
        {activePreset !== 'custom' && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {PRESETS[activePreset as Exclude<PresetKey, 'custom'>].desc}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/* ── 产品表编辑器 ── */
function ProductTableEditor() {
  const { params, setParams } = useCalculatorStore()
  const rows = params.productTable

  const updateRow = (idx: number, field: keyof ProductRow, value: number) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    setParams({ productTable: next })
  }
  const addRow = () => {
    const last = rows[rows.length - 1]
    const next: ProductRow = {
      ratioN: last ? last.ratioN + 2 : 10,
      reflectancePercent: last ? Math.max(5, last.reflectancePercent - 10) : 20,
      tempDrop: last ? Math.max(1, last.tempDrop - 2) : 3,
      coverage: last ? last.coverage + 100 : 800,
    }
    setParams({ productTable: [...rows, next] })
  }
  const deleteRow = (idx: number) => {
    setParams({ productTable: rows.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left font-medium py-1.5 px-1 w-[22%]">兑水比<br/>1:N</th>
              <th className="text-center font-medium py-1.5 px-1 w-[22%]">遮阳率<br/>(%)</th>
              <th className="text-center font-medium py-1.5 px-1 w-[20%]">降温<br/>(°C)</th>
              <th className="text-center font-medium py-1.5 px-1 w-[24%]">喷洒面积<br/>(㎡/kg)</th>
              <th className="w-[12%]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-1 px-1">
                  <Input
                    type="number" value={r.ratioN} step={1} min={1}
                    onChange={(e) => updateRow(i, 'ratioN', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-center tabular-nums px-1"
                  />
                </td>
                <td className="py-1 px-1">
                  <Input
                    type="number" value={r.reflectancePercent} step={1} min={0} max={100}
                    onChange={(e) => updateRow(i, 'reflectancePercent', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-center tabular-nums px-1"
                  />
                </td>
                <td className="py-1 px-1">
                  <Input
                    type="number" value={r.tempDrop} step={0.5} min={0}
                    onChange={(e) => updateRow(i, 'tempDrop', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-center tabular-nums px-1"
                  />
                </td>
                <td className="py-1 px-1">
                  <Input
                    type="number" value={r.coverage} step={10} min={1}
                    onChange={(e) => updateRow(i, 'coverage', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-center tabular-nums px-1"
                  />
                </td>
                <td className="py-1 px-1 text-center">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => deleteRow(i)} disabled={rows.length <= 2}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1" /> 添加产品数据
      </Button>
      <p className="text-[10px] text-muted-foreground">
        至少 2 行 · 遮阳率填百分比 · 喷洒面积 = 每公斤粉剂可喷 m²
      </p>
    </div>
  )
}

/* ── K 值映射表编辑器 ── */
function KMappingEditor() {
  const { params, setParams } = useCalculatorStore()
  const rows = params.kMapping

  const updateRow = (idx: number, field: keyof KMappingRow, value: number) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    setParams({ kMapping: next })
  }
  const addRow = () => {
    const next: KMappingRow = { r: 0.45, ratio: 4 }
    setParams({ kMapping: [...rows, next] })
  }
  const deleteRow = (idx: number) => {
    setParams({ kMapping: rows.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">稀释比映射表（R → 兑水比）</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b">
            <th className="text-left font-medium py-1.5 px-1">遮阳率 R</th>
            <th className="w-[10%]"></th>
            <th className="text-left font-medium py-1.5 px-1">兑水比 1:N</th>
            <th className="w-[12%]"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-1 px-1">
                <Input
                  type="number" value={r.r} step={0.05} min={0} max={1}
                  onChange={(e) => updateRow(i, 'r', parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs text-center tabular-nums px-1"
                />
              </td>
              <td className="text-center text-muted-foreground">→</td>
              <td className="py-1 px-1">
                <Input
                  type="number" value={r.ratio} step={0.5} min={0.5}
                  onChange={(e) => updateRow(i, 'ratio', parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs text-center tabular-nums px-1"
                />
              </td>
              <td className="py-1 px-1 text-center">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => deleteRow(i)} disabled={rows.length <= 2}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1" /> 添加行
      </Button>
    </div>
  )
}

/* ── 光谱控制点编辑器 ── */
function SpectrumEditor() {
  const { params, setParams } = useCalculatorStore()
  const [text, setText] = React.useState('')

  React.useEffect(() => {
    setText(JSON.stringify(params.spectrumPoints, null, 0))
  }, [params.spectrumPoints])

  const apply = () => {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed) && parsed.every((p) => 'x' in p && 'y' in p)) {
        setParams({ spectrumPoints: parsed as SpectrumPoint[] })
      } else {
        throw new Error('格式错误')
      }
    } catch {
      // 静默
    }
  }

  const reset = () => {
    import('@/lib/calculator').then(({ CONFIG }) => {
      setParams({ spectrumPoints: CONFIG.SPECTRAL_DEFAULT_CONTROLS.map((p) => ({ ...p })) })
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">光谱控制点（波长 nm / 反射率 0-1）</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={reset}>
          <RotateCcw className="h-3 w-3 mr-1" /> 恢复默认
        </Button>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={apply}
        className="font-mono text-[11px] h-24 scrollbar-thin"
        placeholder='[{"x":380,"y":0.15},...]'
      />
      <p className="text-[10px] text-muted-foreground">
        编辑后失焦自动应用。建议 5-7 个控制点覆盖 380-1100nm。白涂剂典型：PAR 低反射、IR 高反射。
      </p>
    </div>
  )
}

/* ── 主输入面板 ── */
export function InputPanel() {
  const { params, setParam, setParams, reset, validation } = useCalculatorStore()
  const isTable = params.calcMode === 'table'
  const isSpectral = isTable && params.tableSubMode === 'spectral'
  const invalid = new Set(validation.invalidFields)

  return (
    <div className="space-y-3">
      <PresetSelector />

      <Accordion type="multiple" defaultValue={['plant', 'weather', 'cooling', 'op']} className="space-y-3">
        {/* 植物参数 */}
        <AccordionItem value="plant" className="border rounded-lg overflow-hidden bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <FlaskConical className="h-4 w-4 text-primary" />
              植物参数
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-3">
            <NumField id="LSP" label="光饱和点 LSP" value={params.LSP}
              onChange={(v) => setParam('LSP', v)} unit="μmol/m²/s" step={10} min={500} max={2500}
              invalid={invalid.has('LSP')} hint="光合速率不再随光强增加的临界点" />
            <NumField id="LCP" label="光补偿点 LCP" value={params.LCP}
              onChange={(v) => setParam('LCP', v)} unit="μmol/m²/s" step={1} min={1} max={500}
              invalid={invalid.has('LCP')} hint="光合=呼吸的临界点" />
            <NumField id="T0" label={<>HHA 高温阈值 T<sub>0</sub></>} value={params.T0}
              onChange={(v) => setParam('T0', v)} unit="°C" step={0.1} min={30} max={45}
              invalid={invalid.has('T0')} hint="开始累积有害积热的温度" />
          </AccordionContent>
        </AccordionItem>

        {/* 天气与大棚 */}
        <AccordionItem value="weather" className="border rounded-lg overflow-hidden bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sun className="h-4 w-4 text-primary" />
              天气与大棚
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-3">
            <NumField id="Tmax" label={<>棚内日最高温 T<sub>max</sub></>} value={params.Tmax}
              onChange={(v) => setParam('Tmax', v)} unit="°C" step={0.1} min={20} max={60}
              invalid={invalid.has('Tmax')} />
            <NumField id="Tmin" label={<>棚内日最低温 T<sub>min</sub></>} value={params.Tmin}
              onChange={(v) => setParam('Tmin', v)} unit="°C" step={0.1} min={5} max={40}
              invalid={invalid.has('Tmin')} />
            <NumField id="D" label="日长 D" value={params.D}
              onChange={(v) => setParam('D', v)} unit="小时" step={0.5} min={8} max={16}
              invalid={invalid.has('D')} />
            <NumField id="Imax" label={<>正午 PAR 峰值 I<sub>max</sub></>} value={params.Imax}
              onChange={(v) => setParam('Imax', v)} unit="μmol/m²/s" step={10} min={500} max={2500}
              invalid={invalid.has('Imax')} hint="晴天约 1600-2000" />
            <NumField id="RH" label="棚内日间均湿 RH" value={params.RH}
              onChange={(v) => setParam('RH', v)} unit="%" step={1} min={10} max={100}
              invalid={invalid.has('RH')} />
          </AccordionContent>
        </AccordionItem>

        {/* 降温剂特性 */}
        <AccordionItem value="cooling" className="border rounded-lg overflow-hidden bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Droplets className="h-4 w-4 text-primary" />
              降温剂特性
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-3 space-y-3">
            <RadioGroup
              value={params.calcMode}
              onValueChange={(v) => setParam('calcMode', v as CalcParams['calcMode'])}
              className="flex gap-2"
            >
              <Label className="flex items-center gap-1.5 cursor-pointer rounded-md border px-3 py-1.5 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="table" className="h-3.5 w-3.5" /> 表格模式（推荐）
              </Label>
              <Label className="flex items-center gap-1.5 cursor-pointer rounded-md border px-3 py-1.5 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="k" className="h-3.5 w-3.5" /> k 值模式（备用）
              </Label>
            </RadioGroup>

            {isTable ? (
              <>
                <RadioGroup
                  value={params.tableSubMode}
                  onValueChange={(v) => setParam('tableSubMode', v as CalcParams['tableSubMode'])}
                  className="flex gap-2"
                >
                  <Label className="flex items-center gap-1.5 cursor-pointer rounded-md border px-3 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="full" className="h-3.5 w-3.5" /> 全遮阳率
                  </Label>
                  <Label className="flex items-center gap-1.5 cursor-pointer rounded-md border px-3 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="spectral" className="h-3.5 w-3.5" /> 光谱选择（高级）
                  </Label>
                </RadioGroup>
                <ProductTableEditor />
                {isSpectral && <SpectrumEditor />}
              </>
            ) : (
              <>
                <NumField id="k" label="降温系数 k" value={params.k}
                  onChange={(v) => setParam('k', v)} unit="ΔT=k·R" step={0.1} min={5} max={25}
                  invalid={invalid.has('k')} hint="R=30% 时降温约 4°C" />
                <KMappingEditor />
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 作业参数 */}
        <AccordionItem value="op" className="border rounded-lg overflow-hidden bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="h-4 w-4 text-primary" />
              作业与经济参数
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-3">
            <NumField id="sprayArea" label="大棚面积" value={params.sprayArea}
              onChange={(v) => setParam('sprayArea', v)} unit="亩" step={0.1} min={0.1} max={500}
              invalid={invalid.has('sprayArea')} hint="1亩 ≈ 667㎡" />
            <NumField id="sprayerCap" label="喷雾器容量" value={params.sprayerCap}
              onChange={(v) => setParam('sprayerCap', v)} unit="L/桶" step={1} min={1} max={2000}
              invalid={invalid.has('sprayerCap')} />
            <NumField id="powderPrice" label="粉剂单价" value={params.powderPrice}
              onChange={(v) => setParam('powderPrice', v)} unit="元/kg" step={0.1} min={0} max={10000}
              invalid={invalid.has('powderPrice')} />
            <NumField id="grapePrice" label="葡萄售价" value={params.grapePrice}
              onChange={(v) => setParam('grapePrice', v)} unit="元/kg" step={0.5} min={0} max={100}
              hint="用于净收益分析" />
            <NumField id="expectedYield" label="预期亩产" value={params.expectedYield}
              onChange={(v) => setParam('expectedYield', v)} unit="kg/亩" step={50} min={100} max={5000}
              hint="用于净收益分析" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button variant="outline" className="w-full" onClick={reset}>
        <RotateCcw className="h-4 w-4 mr-2" /> 恢复默认值
      </Button>
    </div>
  )
}
