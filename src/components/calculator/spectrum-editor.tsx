'use client'

import * as React from 'react'
import { RotateCcw, Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCalculatorStore } from './store'
import { CONFIG } from '@/lib/calculator'
import { fritschCarlsonSpline, integrateSpectrum } from '@/lib/calculator/engine'
import type { SpectrumPoint } from '@/lib/calculator'
import { useTheme } from 'next-themes'

const W_MIN = 380
const W_MAX = 1100
const STEP = 10
const N_POINTS = (W_MAX - W_MIN) / STEP + 1 // 73

/** 波长 → RGB 可见色（380-780nm 近似，780+ 为深红/红外暗色） */
function wavelengthToRGB(wl: number): string {
  if (wl < 380) return '#8b008b'
  if (wl > 780) {
    // 近红外：随波长变暗的暗红色
    const t = Math.min(1, (wl - 780) / 320)
    const r = Math.round(120 * (1 - t * 0.7))
    const g = Math.round(20 * (1 - t))
    const b = Math.round(20 * (1 - t))
    return `rgb(${r},${g},${b})`
  }
  let r = 0, g = 0, b = 0
  if (wl >= 380 && wl < 440) { r = -(wl - 440) / 60; g = 0; b = 1 }
  else if (wl < 490) { r = 0; g = (wl - 440) / 50; b = 1 }
  else if (wl < 510) { r = 0; g = 1; b = -(wl - 510) / 20 }
  else if (wl < 580) { r = (wl - 510) / 70; g = 1; b = 0 }
  else if (wl < 645) { r = 1; g = -(wl - 645) / 65; b = 0 }
  else { r = 1; g = 0; b = 0 }
  // 边缘衰减
  let factor = 1
  if (wl > 700) factor = 0.3 + 0.7 * (780 - wl) / 80
  if (wl < 420) factor = 0.3 + 0.7 * (wl - 380) / 40
  const gamma = 0.8
  const R = Math.round(255 * Math.pow(r * factor, gamma))
  const G = Math.round(255 * Math.pow(g * factor, gamma))
  const B = Math.round(255 * Math.pow(b * factor, gamma))
  return `rgb(${R},${G},${B})`
}

export function SpectrumEditor() {
  const { params, setParams } = useCalculatorStore()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const points = params.spectrumPoints
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [dragIdx, setDragIdx] = React.useState<number | null>(null)
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)

  // 计算插值曲线 + 积分结果
  const { curve, summary } = React.useMemo(() => {
    const sorted = [...points].sort((a, b) => a.x - b.x)
    const c = fritschCarlsonSpline(sorted, W_MIN, W_MAX, STEP)
    const peak = Math.max(...c.map((p) => p.y), 0.001)
    const norm = c.map((p) => ({ x: p.x, y: p.y / peak }))
    const s = integrateSpectrum(norm)
    return { curve: c, summary: s }
  }, [points])

  // SVG 坐标转换
  const W = 760 // svg viewBox width
  const H = 240 // svg viewBox height
  const padL = 44, padR = 16, padT = 16, padB = 40
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const xToPx = (x: number) => padL + ((x - W_MIN) / (W_MAX - W_MIN)) * plotW
  const yToPx = (y: number) => padT + (1 - y) * plotH
  const pxToX = (px: number) => W_MIN + ((px - padL) / plotW) * (W_MAX - W_MIN)
  const pxToY = (py: number) => 1 - (py - padT) / plotH

  // 鼠标 → SVG 坐标
  const getSvgPoint = (e: React.PointerEvent | React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current!
    const rect = svg.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // 拖拽控制点
  const handlePointerDown = (e: React.PointerEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragIdx(idx)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragIdx == null) return
    const { x, y } = getSvgPoint(e)
    const newX = Math.max(W_MIN, Math.min(W_MAX, pxToX(x)))
    const newY = Math.max(0, Math.min(1, pxToY(y)))
    const next = points.map((p, i) => (i === dragIdx ? { x: +newX.toFixed(0), y: +newY.toFixed(3) } : p))
    // 保持 x 升序：若拖拽导致交叉，交换
    next.sort((a, b) => a.x - b.x)
    setParams({ spectrumPoints: next })
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragIdx != null) {
      ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    }
    setDragIdx(null)
  }

  // 双击空白处添加控制点
  const handleDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = getSvgPoint(e)
    if (x < padL || x > W - padR || y < padT || y > H - padB) return
    const newX = Math.round(pxToX(x))
    const newY = +pxToY(y).toFixed(3)
    if (points.some((p) => Math.abs(p.x - newX) < 15)) return // 避免太近
    const next = [...points, { x: newX, y: newY }].sort((a, b) => a.x - b.x)
    setParams({ spectrumPoints: next })
  }

  // 删除控制点（右键或点击删除按钮）
  const deletePoint = (idx: number) => {
    if (points.length <= 3) return // 至少保留 3 个
    setParams({ spectrumPoints: points.filter((_, i) => i !== idx) })
  }

  const reset = () => {
    setParams({ spectrumPoints: CONFIG.SPECTRAL_DEFAULT_CONTROLS.map((p) => ({ ...p })) })
  }

  // 太阳光谱曲线（用于背景参考）
  const solarPts = CONFIG.SOLAR_SPECTRUM_DATA

  // 植物响应曲线（用于背景参考）
  const plantPts = CONFIG.PLANT_RESPONSE_DEFAULT

  // PAR 区域标识 (400-700nm)
  const parStartPx = xToPx(400)
  const parEndPx = xToPx(700)

  const strokeGrid = isDark ? '#ffffff20' : '#00000010'
  const strokeAxis = isDark ? '#ffffff60' : '#00000060'
  const textFill = isDark ? '#ffffffaa' : '#000000aa'

  const applyPreset = (presetKey: string) => {
    const preset = CONFIG.SPECTRAL_PRESETS.find((p) => p.key === presetKey)
    if (preset) {
      setParams({ spectrumPoints: preset.points.map((p) => ({ ...p })) })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">光谱反射率曲线（拖拽控制点 · 双击空白添加）</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={reset}>
          <RotateCcw className="h-3 w-3 mr-1" /> 恢复默认
        </Button>
      </div>

      {/* 光谱预设库 */}
      <div className="flex flex-wrap gap-1.5">
        {CONFIG.SPECTRAL_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium transition-all hover:border-primary hover:bg-primary/5 hover:shadow-sm"
            title={p.desc}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full border border-border"
              style={{ backgroundColor: p.color }}
            />
            {p.name}
          </button>
        ))}
      </div>

      <div className="rounded-md border bg-card p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-none select-none"
          style={{ cursor: 'crosshair' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
          {/* PAR 区域背景 */}
          <rect
            x={parStartPx} y={padT} width={parEndPx - parStartPx} height={plotH}
            fill="var(--accent)" fillOpacity={0.15}
          />
          <text x={(parStartPx + parEndPx) / 2} y={padT + 10} textAnchor="middle"
            fontSize={9} fill="var(--accent-foreground)" opacity={0.6}>
            PAR 400-700nm
          </text>

          {/* 网格线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <line key={v} x1={padL} x2={W - padR} y1={yToPx(v)} y2={yToPx(v)}
              stroke={strokeGrid} strokeWidth={1} />
          ))}
          {[400, 550, 700, 850, 1000].map((wl) => (
            <line key={wl} x1={xToPx(wl)} x2={xToPx(wl)} y1={padT} y2={H - padB}
              stroke={strokeGrid} strokeWidth={1} />
          ))}

          {/* 太阳光谱（归一化填充，背景） */}
          <path
            d={`M ${padL} ${yToPx(0)} ${solarPts.map((s, i) => {
              const wl = W_MIN + i * STEP
              return `L ${xToPx(wl)} ${yToPx(s)}`
            }).join(' ')} L ${W - padR} ${yToPx(0)} Z`}
            fill="#fbbf24" fillOpacity={0.12} stroke="none"
          />

          {/* 植物响应曲线（虚线） */}
          <path
            d={`M ${plantPts.map((s, i) => {
              const wl = W_MIN + i * STEP
              return `${i === 0 ? 'M' : 'L'} ${xToPx(wl)} ${yToPx(s)}`
            }).join(' ')}`}
            fill="none" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6}
          />

          {/* 反射率插值曲线（主曲线） */}
          <path
            d={`M ${curve.map((p) => `${xToPx(p.x)} ${yToPx(p.y)}`).join(' L ')}`}
            fill="none" stroke="var(--primary)" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* 曲线下填充 */}
          <path
            d={`M ${xToPx(W_MIN)} ${yToPx(0)} L ${curve.map((p) => `${xToPx(p.x)} ${yToPx(p.y)}`).join(' L ')} L ${xToPx(W_MAX)} ${yToPx(0)} Z`}
            fill="var(--primary)" fillOpacity={0.08}
          />

          {/* 坐标轴 */}
          <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke={strokeAxis} strokeWidth={1.5} />
          <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke={strokeAxis} strokeWidth={1.5} />

          {/* X 轴刻度 */}
          {[400, 550, 700, 850, 1000].map((wl) => (
            <g key={wl}>
              <line x1={xToPx(wl)} x2={xToPx(wl)} y1={H - padB} y2={H - padB + 4} stroke={strokeAxis} />
              <text x={xToPx(wl)} y={H - padB + 14} textAnchor="middle" fontSize={9} fill={textFill}>
                {wl}
              </text>
            </g>
          ))}
          <text x={(padL + W - padR) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill={textFill}>
            波长 (nm)
          </text>

          {/* Y 轴刻度 */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={padL - 4} x2={padL} y1={yToPx(v)} y2={yToPx(v)} stroke={strokeAxis} />
              <text x={padL - 6} y={yToPx(v) + 3} textAnchor="end" fontSize={9} fill={textFill}>
                {v.toFixed(2)}
              </text>
            </g>
          ))}

          {/* 可见光彩虹条（X 轴下方） */}
          {Array.from({ length: N_POINTS }, (_, i) => {
            const wl = W_MIN + i * STEP
            if (wl > 780) return null
            return (
              <rect
                key={wl} x={xToPx(wl)} y={H - padB + 20} width={plotW / N_POINTS + 1} height={4}
                fill={wavelengthToRGB(wl)} opacity={0.7}
              />
            )
          })}

          {/* 控制点（可拖拽） */}
          {points.map((p, i) => {
            const cx = xToPx(p.x)
            const cy = yToPx(p.y)
            const isDragging = dragIdx === i
            const isHover = hoverIdx === i
            return (
              <g key={i}>
                {/* 垂直辅助线 */}
                <line
                  x1={cx} x2={cx} y1={cy} y2={H - padB}
                  stroke="var(--primary)" strokeWidth={1} strokeDasharray="2 2" opacity={isDragging || isHover ? 0.6 : 0.25}
                />
                {/* 控制点圆 */}
                <circle
                  cx={cx} cy={cy} r={isDragging ? 8 : 6}
                  fill="var(--background)" stroke="var(--primary)" strokeWidth={2.5}
                  className="cursor-grab active:cursor-grabbing transition-[r]"
                  onPointerDown={(e) => handlePointerDown(e, i)}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
                {/* 拖拽时显示数值 */}
                {(isDragging || isHover) && (
                  <g>
                    <rect
                      x={cx - 38} y={cy - 26} width={76} height={16} rx={3}
                      fill="var(--popover)" stroke="var(--border)" strokeWidth={1}
                    />
                    <text
                      x={cx} y={cy - 14} textAnchor="middle" fontSize={9}
                      fill="var(--popover-foreground)" className="tabular-nums"
                    >
                      {p.x}nm · {(p.y * 100).toFixed(0)}%
                    </text>
                  </g>
                )}
                {/* 删除按钮（hover 时显示，且点数 > 3） */}
                {isHover && points.length > 3 && (
                  <g
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); deletePoint(i) }}
                  >
                    <circle cx={cx + 10} cy={cy - 10} r={7} fill="var(--destructive)" />
                    <text x={cx + 10} y={cy - 7} textAnchor="middle" fontSize={10} fill="white">×</text>
                  </g>
                )}
              </g>
            )
          })}

          {/* 图例 */}
          <g transform={`translate(${W - padR - 130}, ${padT + 4})`}>
            <rect x={-4} y={-4} width={134} height={42} rx={3}
              fill="var(--card)" stroke="var(--border)" strokeWidth={1} opacity={0.9} />
            <line x1={4} x2={20} y1={6} y2={6} stroke="var(--primary)" strokeWidth={2.5} />
            <text x={24} y={9} fontSize={8} fill={textFill}>反射率（可拖拽）</text>
            <line x1={4} x2={20} y1={18} y2={18} stroke="#fbbf24" strokeWidth={6} opacity={0.5} />
            <text x={24} y={21} fontSize={8} fill={textFill}>太阳光谱</text>
            <line x1={4} x2={20} y1={30} y2={30} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7} />
            <text x={24} y={33} fontSize={8} fill={textFill}>植物光合响应</text>
          </g>
        </svg>
      </div>

      {/* 积分结果摘要 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border bg-muted/30 p-2 text-center">
          <div className="text-[10px] text-muted-foreground">总遮阳率 S_total</div>
          <div className="text-lg font-bold tabular-nums text-primary">
            {Number.isFinite(summary.S_total) ? `${(summary.S_total * 100).toFixed(1)}%` : '--'}
          </div>
        </div>
        <div className="rounded-md border bg-muted/30 p-2 text-center">
          <div className="text-[10px] text-muted-foreground">有效 PAR 透过率 τ_PAR</div>
          <div className="text-lg font-bold tabular-nums text-primary">
            {Number.isFinite(summary.Tau_PAR_eff) ? `${(summary.Tau_PAR_eff * 100).toFixed(1)}%` : '--'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>共 {points.length} 个控制点（双击空白添加 · 点 × 删除）</span>
        <span className="flex items-center gap-1">
          <GripVertical className="h-3 w-3" />
          拖拽圆点调整反射率
        </span>
      </div>
    </div>
  )
}
