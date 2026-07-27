/**
 * 光照 → 光合转化效率（一天内）—— 新增可视化面板的纯计算引擎
 *
 * 目的：把"同样的一天光照，在不同光合响应假设下，冠层能利用多少光"直观画出来。
 * 三种模型对应三种典型曲线形态（与需求里的单峰 / 平台 / 双峰对应）：
 *
 *   - limiting        光限制型：效率≈正比光强（弱光 / 高遮阳 / 阴生叶）      → 单峰
 *   - saturating      光饱和型：达光饱和点后封顶（引擎默认采用的 M–M 模型） → 平台
 *   - photoinhibition 光抑制型：正午强光/高温致气孔关闭与光抑制，速率回落   → 双峰（午休）
 *
 * 曲线下方阴影 = 全天累计光合（对效率沿时间积分），对应引擎里真正积分的那个量 A。
 * 可叠加"施用降温剂后"的曲线：遮阳按 PAR 透过率 τ = max(0, 1 − R·k_PAR) 压低进光，
 * 直观展示遮阳如何削掉正午过饱和 / 缓解午休。
 *
 * 全为纯函数、无副作用，可在浏览器与 Node 中直接复算（本项目已用 Node 验证形态）。
 */
import { dayShape } from './engine'
import { CONFIG } from './presets'
import type { CalcParams } from './types'

export type LightModel = 'limiting' | 'saturating' | 'photoinhibition'

export interface LightModelMeta {
  key: LightModel
  name: string
  shape: string
  desc: string
  color: string
}

export const LIGHT_MODELS: readonly LightModelMeta[] = [
  {
    key: 'saturating',
    name: '光饱和型',
    shape: '平台',
    desc: '达光饱和点后速率封顶——正午出现平台。引擎默认采用的 Michaelis–Menten 模型。',
    color: 'var(--chart-1)',
  },
  {
    key: 'limiting',
    name: '光限制型',
    shape: '单峰',
    desc: '光合速率≈正比光强（弱光 / 高遮阳 / 阴生叶场景）——效率跟随光强，单峰。',
    color: 'var(--chart-2)',
  },
  {
    key: 'photoinhibition',
    name: '光抑制型',
    shape: '双峰（午休）',
    desc: '正午强光与高温致气孔关闭 + 光抑制，速率回落——出现"午休"双峰。设施葡萄夏季常见。',
    color: 'var(--chart-3)',
  },
] as const

export interface LightResponsePoint {
  /** 时刻（小时，24h 制） */
  h: number
  /** 时刻标签，如 "12:00" */
  label: string
  /** 到达冠层的瞬时 PAR（未遮阳） */
  PAR: number
  /** 瞬时光能转化效率 0–1（未遮阳） */
  eff: number
  /** 瞬时效率（施用遮阳后） */
  effShaded: number
}

export interface LightResponseResult {
  model: LightModel
  meta: LightModelMeta
  points: LightResponsePoint[]
  /** 全天累计效能（效率对时间积分，未遮阳） */
  integral: number
  /** 全天累计效能（施用遮阳后） */
  integralShaded: number
  /** 峰的个数（1=单峰/平台，2=双峰） */
  peakCount: number
  /** 峰值效率 */
  maxEff: number
  /** 正午（峰值时刻） */
  peakHour: number
  /** 当前遮阳率 R（用于展示） */
  R: number
}

/** 单点光响应：给定到达叶片的 PAR，返回 0–1 的瞬时效率 */
export function efficiencyAt(
  I: number, model: LightModel, LSP: number, LCP: number, Imax: number,
): number {
  if (I <= LCP) return 0
  const Km = ((LSP - LCP) * (1 - CONFIG.P_AT_LSP)) / CONFIG.P_AT_LSP

  // 饱和型：Michaelis–Menten + 光饱和点封顶（I≥LSP → 1）
  const saturated = I >= LSP ? 1 : (I - LCP) / (I - LCP + Km)

  switch (model) {
    case 'saturating':
      return clamp01(saturated)

    case 'limiting':
      // 正比到达光强（按当日最大光强归一），不封顶 → 单峰
      return clamp01((I - LCP) / Math.max(1e-6, Imax - LCP))

    case 'photoinhibition': {
      // 在饱和曲线基础上叠加"超过某光强后回落"的高斯抑制 → 双峰
      const Iopt = 0.55 * LSP
      const inhib = I > Iopt
        ? Math.exp(-Math.pow((I - Iopt) / (0.9 * LSP), 2) * 1.6)
        : 1
      return clamp01(saturated * inhib)
    }
    default:
      return clamp01(saturated)
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/**
 * 计算一天内的光照 → 光合效率曲线
 * @param params 计算参数（用 LSP/LCP/Imax/D）
 * @param model  光响应模型
 * @param R      当前遮阳率（0–1），用于叠加"施用后"曲线；0 表示不遮阳
 * @param stepH  时间步长（小时），默认 0.25（更平滑）
 */
export function computeLightResponse(
  params: Pick<CalcParams, 'LSP' | 'LCP' | 'Imax' | 'D'>,
  model: LightModel,
  R = 0,
  stepH = 0.25,
): LightResponseResult {
  const { LSP, LCP, Imax, D } = params
  const meta = LIGHT_MODELS.find((m) => m.key === model) ?? LIGHT_MODELS[0]
  const sunrise = CONFIG.SUNRISE
  const sunset = sunrise + D
  const tau = Math.max(0, 1 - R * CONFIG.PAR_TRANSMISSION_FACTOR)

  const points: LightResponsePoint[] = []
  let integral = 0
  let integralShaded = 0
  let prevEff = 0
  let prevEffShaded = 0
  let prevH = sunrise
  let maxEff = 0
  let peakHour = (sunrise + sunset) / 2

  for (let h = sunrise; h <= sunset + 1e-9; h += stepH) {
    const s = Math.max(0, Math.min(1, dayShape(h, D)))
    const PAR = Imax * s
    const eff = efficiencyAt(PAR, model, LSP, LCP, Imax)
    const effShaded = efficiencyAt(PAR * tau, model, LSP, LCP, Imax)

    if (h > sunrise) {
      integral += ((eff + prevEff) / 2) * (h - prevH)
      integralShaded += ((effShaded + prevEffShaded) / 2) * (h - prevH)
    }
    if (eff > maxEff) { maxEff = eff; peakHour = h }

    points.push({
      h: +h.toFixed(2),
      label: formatHour(h),
      PAR: Math.round(PAR),
      eff: +eff.toFixed(4),
      effShaded: +effShaded.toFixed(4),
    })
    prevEff = eff
    prevEffShaded = effShaded
    prevH = h
  }

  return {
    model,
    meta,
    points,
    integral: +integral.toFixed(3),
    integralShaded: +integralShaded.toFixed(3),
    peakCount: countPeaks(points.map((p) => p.eff)),
    maxEff: +maxEff.toFixed(3),
    peakHour: +peakHour.toFixed(2),
    R,
  }
}

/** 数峰：局部极大且高于阈值 */
function countPeaks(ys: number[]): number {
  let peaks = 0
  for (let i = 1; i < ys.length - 1; i++) {
    if (ys[i] > ys[i - 1] && ys[i] >= ys[i + 1] && ys[i] > 0.15) peaks++
  }
  return Math.max(1, peaks)
}

/** 小时数 → "H:MM" */
function formatHour(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh}:${mm.toString().padStart(2, '0')}`
}
