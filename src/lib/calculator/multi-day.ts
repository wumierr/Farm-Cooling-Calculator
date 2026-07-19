/**
 * 多日预报批量计算引擎
 *
 * 场景：种植户拿到未来 N 天天气预报（Tmax/Tmin/Imax 各日不同），
 * 需要决定：(a) 这 N 天是否需要喷洒降温剂？(b) 若喷，用哪个遮阳率最优？
 * (c) 每天累积的 HHA 与累积产量损失如何？
 *
 * 模型简化（实际应用取舍）：
 * - 假设一次喷洒的降温剂效果持续 N 天（典型 7-10 天，随雨水冲刷衰减）
 * - 使用同一 R 值贯穿全周期（实际可按日衰减，但田间决策粒度到此即可）
 * - 累积 HHA = Σ 每日 HHA，累积损失按累积 HHA 查表（非线性，比每日损失相加更准）
 */
import { CONFIG } from './presets';
import {
  generateHourlyTemps, generateHourlySolar, getCooledTemps,
  calcHHA, calcLossRate, photosynthCore, calcPhotosynth,
  getTempDrop, normalizeProductTable, fritschCarlsonSpline, integrateSpectrum,
} from './engine';
import type { CalcParams, ResultPoint } from './types';

/** 单日天气输入 */
export interface DayWeather {
  /** 日最高温 °C */
  Tmax: number;
  /** 日最低温 °C */
  Tmin: number;
  /** 日长 小时 */
  D: number;
  /** PAR 峰值 μmol/m²/s */
  Imax: number;
  /** 日均湿度 % */
  RH: number;
  /** 日期标签（如 "7/19" 或 "Day 1"） */
  label: string;
}

/** 单日计算结果 */
export interface DayResult {
  label: string
  /** 当日 HHA °C²·h */
  HHA: number
  /** 当日产量损失率（基于当日 HHA，单日值） */
  dailyLoss: number
  /** 当日降温后棚内最高温 */
  Tmax_cooled: number
  /** 当日降温幅度 */
  deltaT: number
  /** 当日相对光合保留率 */
  A_rel: number
  /** 当日综合效益 Y */
  Y: number
}

/** 多日批量计算结果 */
export interface MultiDayOutput {
  /** 逐日结果 */
  days: DayResult[]
  /** 累积 HHA（Σ 当日 HHA） */
  totalHHA: number
  /** 累积产量损失率（基于累积 HHA 查表，非线性） */
  cumulativeLoss: number
  /** 平均综合效益（算术平均） */
  avgY: number
  /** 平均光合保留率 */
  avgA_rel: number
  /** 总喷洒天数中棚温超阈值的天数 */
  overHeatDays: number
  /** R=0 基准（不施用）对照 */
  baseline: {
    totalHHA: number
    cumulativeLoss: number
    avgY: number
    overHeatDays: number
  }
  /** 相对基准的减损收益 */
  benefit: {
    savedLossPct: number // 累积损失率下降百分点
    savedYieldKg: number
    savedRevenue: number
  }
  error: string | null
}

/** 计算给定 R 下多日累积效果 */
export function calcMultiDay(
  weather: DayWeather[], R: number, params: CalcParams,
): MultiDayOutput {
  if (weather.length === 0) {
    return {
      days: [], totalHHA: 0, cumulativeLoss: 0, avgY: 0, avgA_rel: 0,
      overHeatDays: 0,
      baseline: { totalHHA: 0, cumulativeLoss: 0, avgY: 0, overHeatDays: 0 },
      benefit: { savedLossPct: 0, savedYieldKg: 0, savedRevenue: 0 },
      error: '请至少输入 1 天天气数据',
    }
  }

  const useTable = params.calcMode === 'table'
  const spectrumMode = useTable && params.tableSubMode === 'spectral'
  const productTable = normalizeProductTable(params.productTable)

  // 光谱预计算
  let K_solar: number | null = null
  let K_par: number | null = null
  if (spectrumMode && params.spectrumPoints.length >= 2) {
    const baseCurve = fritschCarlsonSpline(params.spectrumPoints, 380, 1100, 10)
    const peak = Math.max(...baseCurve.map((p) => p.y), 0.001)
    const normCurve = baseCurve.map((p) => ({ x: p.x, y: p.y / peak }))
    const { S_total: Sn, Tau_PAR_eff: Te } = integrateSpectrum(normCurve)
    K_solar = Sn
    K_par = Math.min(1, 1 - Te)
  }

  // 计算 R 下的逐日结果
  const days: DayResult[] = []
  let totalHHA = 0
  let totalY = 0
  let totalA_rel = 0
  let overHeatDays = 0

  // 同时计算基准（R=0）
  let baselineHHA = 0
  let baselineY = 0
  let baselineOverHeat = 0

  for (const w of weather) {
    // ── 施用后 ──
    let deltaT: number, A_rel: number
    if (K_solar != null && K_par != null) {
      const S_total = R * K_solar
      const Tau = Math.max(0, 1 - R * K_par)
      deltaT = getTempDrop(S_total, useTable, productTable, params.k)
      A_rel = photosynthCore(Tau, params.LSP, params.LCP, w.Imax, w.D) /
        Math.max(1e-9, photosynthCore(1, params.LSP, params.LCP, w.Imax, w.D))
    } else {
      deltaT = getTempDrop(R, useTable, productTable, params.k)
      A_rel = calcPhotosynth(R, params.LSP, params.LCP, w.Imax, w.D) /
        Math.max(1e-9, calcPhotosynth(0, params.LSP, params.LCP, w.Imax, w.D))
    }
    const temps = generateHourlyTemps(w.Tmax, w.Tmin, w.D)
    const solar = generateHourlySolar(w.D)
    const cooled = getCooledTemps(temps, solar, deltaT)
    const HHA = calcHHA(cooled, params.T0, w.RH)
    const L = calcLossRate(HHA)
    const Y = Math.max(0, Math.min(1, A_rel * (1 - L)))
    totalHHA += HHA
    totalY += Y
    totalA_rel += A_rel
    if (w.Tmax - deltaT > params.T0) overHeatDays++
    days.push({
      label: w.label,
      HHA: Math.round(HHA * 10) / 10,
      dailyLoss: L,
      Tmax_cooled: +(w.Tmax - deltaT).toFixed(1),
      deltaT: +deltaT.toFixed(1),
      A_rel,
      Y,
    })

    // ── 基准 R=0 ──
    const cooled0 = getCooledTemps(temps, solar, 0)
    const HHA0 = calcHHA(cooled0, params.T0, w.RH)
    baselineHHA += HHA0
    baselineY += 1 * (1 - calcLossRate(HHA0))
    if (w.Tmax > params.T0) baselineOverHeat++
  }

  const n = weather.length
  const cumulativeLoss = calcLossRate(totalHHA)
  const baselineCumulativeLoss = calcLossRate(baselineHHA)
  const totalYield = (params.expectedYield || 0) * (params.sprayArea || 1)
  const savedLossPct = (baselineCumulativeLoss - cumulativeLoss) * 100
  const savedYieldKg = totalYield * (baselineCumulativeLoss - cumulativeLoss)
  const savedRevenue = savedYieldKg * (params.grapePrice || 0)

  return {
    days,
    totalHHA: Math.round(totalHHA * 10) / 10,
    cumulativeLoss,
    avgY: totalY / n,
    avgA_rel: totalA_rel / n,
    overHeatDays,
    baseline: {
      totalHHA: Math.round(baselineHHA * 10) / 10,
      cumulativeLoss: baselineCumulativeLoss,
      avgY: baselineY / n,
      overHeatDays: baselineOverHeat,
    },
    benefit: {
      savedLossPct,
      savedYieldKg,
      savedRevenue,
    },
    error: null,
  }
}

/** 搜索多日场景下的最优 R（累积损失最小 + 平均 Y 最高的加权） */
export function findOptimalMultiDayR(
  weather: DayWeather[], params: CalcParams,
): { R: number; output: MultiDayOutput } | { error: string } {
  let bestR = CONFIG.R_MIN
  let bestOutput: MultiDayOutput | null = null
  // 优化目标：平均 Y 最大化（已含减损 + 光合保留）
  let bestScore = -Infinity

  const steps = Math.round((CONFIG.R_MAX - CONFIG.R_MIN) / CONFIG.R_STEP)
  for (let i = 0; i <= steps; i++) {
    const R = CONFIG.R_MIN + i * CONFIG.R_STEP
    const out = calcMultiDay(weather, R, params)
    if (out.error) return { error: out.error }
    // 加权：avgY 为主，惩罚超温天数
    const score = out.avgY - 0.05 * out.overHeatDays
    if (score > bestScore) {
      bestScore = score
      bestR = Math.round(R * 100) / 100
      bestOutput = out
    }
  }
  return bestOutput ? { R: bestR, output: bestOutput } : { error: '计算失败' }
}

/** 生成默认 7 天天气（基于单日参数微扰，模拟预报） */
export function generateDefaultWeek(base: {
  Tmax: number; Tmin: number; D: number; Imax: number; RH: number;
}): DayWeather[] {
  const days: DayWeather[] = []
  // 模拟 7 天波动：±2°C 温度、±100 PAR、±5% 湿度
  const variations = [0, 1, -1, 2, -2, 1, 0]
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const v = variations[i] ?? 0
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    days.push({
      Tmax: +(base.Tmax + v).toFixed(1),
      Tmin: +(base.Tmin + v * 0.5).toFixed(1),
      D: base.D,
      Imax: Math.round(base.Imax + v * 80),
      RH: Math.max(20, Math.min(95, base.RH + v * 3)),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    })
  }
  return days
}
