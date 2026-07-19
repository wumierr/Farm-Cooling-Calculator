/**
 * 核心计算引擎 — 纯函数实现
 *
 * 包含：气温模型、HHA、产量损失、光合作用、光谱积分、遮阳率优化
 *
 * ── 算法改进说明（相对原 HTML 版本）──
 * 1. 降温量改为日照相关：dT(h) = dT_max × f(dayShape(h))，正午满额、夜间残留
 *    原版恒定降温低估正午热害、高估夜间降温。
 * 2. safeSavePoint 回退逻辑修正：无平台时取 Y ≥ Ymax×0.95 的最低 R（省钱），
 *    而非直接取 bestIndex（那是最高 Y，不省钱）。
 * 3. 表格模式 ratio 统一用线性插值（原版用 nearestStr 导致兑水比离散跳变）。
 * 4. 光谱模式 K_par 计算修正：Tau_PAR_eff = 1 - R×K_par 仅在 K_par<1 时成立，
 *    增加 clamp 防止负透过率。
 */
import { CONFIG } from './presets';
import type {
  CalcParams, ResultPoint, OptimizeOutput, Plateau,
  ProductRow, SpectrumPoint,
} from './types';

/* ================================================================
   插值工具
   ================================================================ */

/**
 * 线性插值（含外推），按 xField 升序查找 yField
 * 调用方须保证 table 已排序
 */
export function linearInterpolate<T extends Record<string, number>>(
  table: T[], xField: keyof T, yField: keyof T, xVal: number,
): number {
  const n = table.length;
  if (n === 0) return NaN;
  if (n === 1) return table[0][yField];

  // 下界线性外推
  if (xVal < table[0][xField]) {
    const dx = table[1][xField] - table[0][xField];
    if (Math.abs(dx) < 1e-9) return table[0][yField];
    const slope = (table[1][yField] - table[0][yField]) / dx;
    return table[0][yField] + slope * (xVal - table[0][xField]);
  }
  // 上界线性外推
  if (xVal > table[n - 1][xField]) {
    const dx = table[n - 1][xField] - table[n - 2][xField];
    if (Math.abs(dx) < 1e-9) return table[n - 1][yField];
    const slope = (table[n - 1][yField] - table[n - 2][yField]) / dx;
    return table[n - 1][yField] + slope * (xVal - table[n - 1][xField]);
  }

  // 二分查找
  let lo = 0, hi = n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (table[mid][xField] === xVal) return table[mid][yField];
    else if (table[mid][xField] < xVal) lo = mid + 1;
    else hi = mid - 1;
  }
  const i = hi;
  const denom = table[i + 1][xField] - table[i][xField];
  if (Math.abs(denom) < 1e-9) return table[i][yField];
  const f = (xVal - table[i][xField]) / denom;
  return table[i][yField] + f * (table[i + 1][yField] - table[i][yField]);
}

/* ================================================================
   气温模型
   ================================================================ */

/** 白天某时刻的归一化因子（0=日出/日落，1=峰值）
 *  支持对称（DAY_PEAK=null）与分段非对称 */
export function dayShape(h: number, D: number): number {
  const sunrise = CONFIG.SUNRISE;
  const sunset = sunrise + D;
  const peak = (CONFIG.DAY_PEAK == null) ? (sunrise + D / 2) : CONFIG.DAY_PEAK;
  const morn = Math.max(1e-6, peak - sunrise);
  const eve = Math.max(1e-6, sunset - peak);
  if (h <= peak) {
    return Math.sin((Math.PI / 2) * (h - sunrise) / morn);
  }
  return Math.sin((Math.PI / 2) * (1 - (h - peak) / eve));
}

/** 生成逐时气温（白天分段正弦，夜间恒 Tmin） */
export function generateHourlyTemps(Tmax: number, Tmin: number, D: number): number[] {
  const points: number[] = [];
  for (let h = 0; h < 24; h += CONFIG.HOUR_STEP) {
    if (h < CONFIG.SUNRISE || h > CONFIG.SUNRISE + D) {
      points.push(Tmin);
    } else {
      const s = Math.max(0, Math.min(1, dayShape(h, D)));
      points.push(Tmin + (Tmax - Tmin) * s);
    }
  }
  return points;
}

/** 逐时日照归一化因子（用于降温量加权） */
export function generateHourlySolar(D: number): number[] {
  const points: number[] = [];
  for (let h = 0; h < 24; h += CONFIG.HOUR_STEP) {
    if (h < CONFIG.SUNRISE || h > CONFIG.SUNRISE + D) {
      points.push(0);
    } else {
      points.push(Math.max(0, Math.min(1, dayShape(h, D))));
    }
  }
  return points;
}

/** 降温后的逐时气温 — 改进版：降温量随日照加权
 *  dT(h) = dT_max × (1-sd) + dT_max × sd × solar(h)
 *  sd=SOLAR_DEPENDENCE：0=恒定，1=完全正比日照 */
export function getCooledTemps(temps: number[], solar: number[], dTMax: number): number[] {
  const sd = CONFIG.SOLAR_DEPENDENCE;
  const baseFrac = 1 - sd * 0.5; // 夜间残留（涂膜热惯性）
  return temps.map((t, i) => {
    const factor = baseFrac + sd * 0.5 * solar[i];
    return t - dTMax * factor;
  });
}

/* ================================================================
   HHA（有害积热） & 产量损失
   ================================================================ */

/** 有害积热（二次方模型 × 湿度放大 × 步长守恒） */
export function calcHHA(temps: number[], T0: number, RH = 60): number {
  const humidFactor = 0.5 + RH / 100;
  let sum = 0;
  for (const t of temps) {
    if (t > T0) sum += Math.pow(t - T0, 2) * humidFactor * CONFIG.HOUR_STEP;
  }
  return sum;
}

/** 三段线性产量损失率 */
export function calcLossRate(HHA: number): number {
  const { MILD, MODERATE, SEVERE, SEVERE_FULL } = CONFIG.HHA_THRESHOLDS;
  const cM = CONFIG.LOSS_CAPS.MILD;
  const cMod = CONFIG.LOSS_CAPS.MODERATE;
  const cS = CONFIG.LOSS_CAPS.SEVERE;

  if (HHA < MILD) return 0;
  if (HHA < MODERATE) return (cM * (HHA - MILD)) / (MODERATE - MILD);
  if (HHA < SEVERE) return cM + ((cMod - cM) * (HHA - MODERATE)) / (SEVERE - MODERATE);
  if (HHA < SEVERE_FULL) return cMod + ((cS - cMod) * (HHA - SEVERE)) / (SEVERE_FULL - SEVERE);
  return cS;
}

/* ================================================================
   光合作用模型
   ================================================================ */

/** 光合核心：给定有效 PAR 透过率 tau，计算归一化光合量（步长守恒）
 *  Michaelis-Menten：P(I) = (I - LCP) / (I - LCP + Km)，I≥LSP 时饱和 */
export function photosynthCore(
  tau: number, LSP: number, LCP: number, Imax: number, D: number,
): number {
  const Iin = Imax * tau;
  const Km = ((LSP - LCP) * (1 - CONFIG.P_AT_LSP)) / CONFIG.P_AT_LSP;
  let total = 0;
  for (let h = CONFIG.SUNRISE; h < CONFIG.SUNRISE + D - 1e-6; h += CONFIG.HOUR_STEP) {
    const s = Math.max(0, Math.min(1, dayShape(h, D)));
    const I = Iin * s;
    if (I <= LCP) continue;
    if (I >= LSP) { total += 1 * CONFIG.HOUR_STEP; continue; }
    total += ((I - LCP) / (I - LCP + Km)) * CONFIG.HOUR_STEP;
  }
  return total;
}

/** 全遮阳率模式：R 为标量，通过 PAR_TRANSMISSION_FACTOR 折算 */
export function calcPhotosynth(
  R: number, LSP: number, LCP: number, Imax: number, D: number,
): number {
  const tau = Math.max(0, 1 - R * CONFIG.PAR_TRANSMISSION_FACTOR);
  return photosynthCore(tau, LSP, LCP, Imax, D);
}

/* ================================================================
   光谱积分引擎
   ================================================================ */

/** Fritsch-Carlson 单调保持三次样条插值
 *  保证不产生过冲振荡，适合反射率曲线 */
export function fritschCarlsonSpline(
  points: SpectrumPoint[], xmin: number, xmax: number, step: number,
): SpectrumPoint[] {
  const n = points.length;
  if (n < 2) {
    const val = n === 1 ? Math.max(0, Math.min(1, points[0].y)) : 0;
    const result: SpectrumPoint[] = [];
    for (let x = xmin; x <= xmax + 0.001; x += step) {
      result.push({ x: +x.toFixed(1), y: val });
    }
    return result;
  }

  if (n === 2) {
    const pts = [...points].sort((a, b) => a.x - b.x);
    const dx = pts[1].x - pts[0].x;
    const result: SpectrumPoint[] = [];
    for (let x = xmin; x <= xmax + 0.001; x += step) {
      const t = Math.max(0, Math.min(1, (x - pts[0].x) / Math.max(1e-9, dx)));
      const y = Math.max(0, Math.min(1, pts[0].y + t * (pts[1].y - pts[0].y)));
      result.push({ x: +x.toFixed(1), y });
    }
    return result;
  }

  const pts = [...points].sort((a, b) => a.x - b.x);

  const h = new Array(n - 1);
  const m = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = pts[i + 1].x - pts[i].x;
    m[i] = (pts[i + 1].y - pts[i].y) / Math.max(1e-9, h[i]);
  }

  const d = new Array(n);
  d[0] = ((2 * h[0] + h[1]) * m[0] - h[0] * m[1]) / Math.max(1e-9, h[0] + h[1]);
  if (d[0] * m[0] <= 0) d[0] = 0;
  d[n - 1] = ((2 * h[n - 2] + h[n - 3]) * m[n - 2] - h[n - 2] * m[n - 3])
    / Math.max(1e-9, h[n - 2] + h[n - 3]);
  if (d[n - 1] * m[n - 2] <= 0) d[n - 1] = 0;

  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      d[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      d[i] = (w1 + w2) / (w1 / Math.max(1e-9, m[i - 1]) + w2 / Math.max(1e-9, m[i]));
    }
  }

  for (let i = 0; i < n; i++) {
    const maxSlope = i < n - 1 ? Math.abs(m[i]) : Math.abs(m[n - 2]);
    if (Math.abs(d[i]) > 3 * maxSlope) {
      d[i] = 3 * maxSlope * (d[i] > 0 ? 1 : -1);
    }
  }

  const result: SpectrumPoint[] = [];
  let seg = 0;
  for (let x = xmin; x <= xmax + 0.001; x += step) {
    while (seg < n - 2 && x > pts[seg + 1].x + 0.001) seg++;
    if (seg >= n - 1) seg = n - 2;

    const x0 = pts[seg].x;
    const x1 = pts[seg + 1].x;
    const hi = Math.max(1e-9, x1 - x0);
    const t = Math.max(0, Math.min(1, (x - x0) / hi));

    const h00 = (1 + 2 * t) * (1 - t) * (1 - t);
    const h10 = t * (1 - t) * (1 - t);
    const h01 = t * t * (3 - 2 * t);
    const h11 = t * t * (t - 1);

    let y = h00 * pts[seg].y + h10 * hi * d[seg] + h01 * pts[seg + 1].y + h11 * hi * d[seg + 1];
    y = Math.max(0, Math.min(1, y));
    result.push({ x: +x.toFixed(1), y });
  }
  return result;
}

/** 光谱积分：计算总遮阳率 S_total 与有效 PAR 透过率 Tau_PAR_eff */
export function integrateSpectrum(curve: SpectrumPoint[]): {
  S_total: number; Tau_PAR_eff: number;
} {
  const solar = CONFIG.SOLAR_SPECTRUM_DATA;
  const plant = CONFIG.PLANT_RESPONSE_DEFAULT;
  const N = 73;

  if (!curve || curve.length < N) {
    return { S_total: NaN, Tau_PAR_eff: NaN };
  }

  let sumSolar = 0, sumWeighted = 0, sumPlantWeighted = 0, sumPlantRef = 0;
  for (let i = 0; i < N; i++) {
    const r = curve[i].y;
    const I = solar[i];
    const p = plant[i];
    sumSolar += I;
    sumWeighted += r * I;
    sumPlantWeighted += r * I * p;
    sumPlantRef += I * p;
  }

  const S_total = sumWeighted / Math.max(1e-9, sumSolar);
  const Rpar_eff = sumPlantWeighted / Math.max(1e-9, sumPlantRef);
  const Tau_PAR_eff = Math.max(0, 1 - Rpar_eff);
  return { S_total, Tau_PAR_eff };
}

/* ================================================================
   降温量获取
   ================================================================ */

/** 规范化产品表（添加 reflectance 小数字段，按 reflectance 升序） */
export function normalizeProductTable(rows: ProductRow[]): Array<ProductRow & {
  reflectance: number; ratio: string;
}> {
  return rows
    .map((r) => ({
      ...r,
      reflectance: r.reflectancePercent / 100,
      ratio: `1:${r.ratioN}`,
    }))
    .sort((a, b) => a.reflectance - b.reflectance);
}

/** 获取峰值降温量 dT_max（R 或 S_total 查表 / k×R） */
export function getTempDrop(
  R: number, useTable: boolean,
  productTable: Array<ProductRow & { reflectance: number }>, k: number,
): number {
  if (useTable && productTable && productTable.length >= 1) {
    return Math.max(0, linearInterpolate(productTable, 'reflectance', 'tempDrop', R));
  }
  return k * R;
}

/* ================================================================
   主优化入口
   ================================================================ */

export function findOptimalR(params: CalcParams): OptimizeOutput {
  const {
    LSP, LCP, Tmax, Tmin, D, Imax, k, T0, RH,
    calcMode, tableSubMode, spectrumPoints, productTable: rawProductTable,
  } = params;

  const useTable = calcMode === 'table';
  const spectrumMode = useTable && tableSubMode === 'spectral';
  const productTable = normalizeProductTable(rawProductTable);

  const baseTemps = generateHourlyTemps(Tmax, Tmin, D);
  const solar = generateHourlySolar(D);
  const baseA = calcPhotosynth(0, LSP, LCP, Imax, D);
  if (baseA === 0) {
    return {
      results: [], optimum: null, plateau: null, bestIndex: -1,
      error: '基准光合量为零，请检查 LSP/LCP/Imax 参数',
    };
  }

  // 光谱模式预计算（O(1) 乘法替代循环内样条+积分）
  let K_solar: number | null = null;
  let K_par: number | null = null;
  if (spectrumMode && spectrumPoints && spectrumPoints.length >= 2) {
    const baseCurve = fritschCarlsonSpline(spectrumPoints, 380, 1100, 10);
    const peak = Math.max(...baseCurve.map((p) => p.y), 0.001);
    const normCurve = baseCurve.map((p) => ({ x: p.x, y: p.y / peak }));
    const { S_total: Sn, Tau_PAR_eff: Te } = integrateSpectrum(normCurve);
    K_solar = Sn;
    K_par = Math.min(1, 1 - Te); // clamp 防止负透过率
  }

  let bestIndex = -1;
  let bestY = -Infinity;
  const results: ResultPoint[] = [];

  const steps = Math.round((CONFIG.R_MAX - CONFIG.R_MIN) / CONFIG.R_STEP);
  for (let i = 0; i <= steps; i++) {
    const R = CONFIG.R_MIN + i * CONFIG.R_STEP;
    let deltaT: number;
    let A_rel: number;

    if (K_solar != null && K_par != null) {
      const S_total = R * K_solar;
      const Tau_PAR_eff = Math.max(0, 1 - R * K_par);
      deltaT = getTempDrop(S_total, useTable, productTable, k);
      A_rel = photosynthCore(Tau_PAR_eff, LSP, LCP, Imax, D) / baseA;
    } else {
      deltaT = getTempDrop(R, useTable, productTable, k);
      A_rel = calcPhotosynth(R, LSP, LCP, Imax, D) / baseA;
    }

    const cooled = getCooledTemps(baseTemps, solar, deltaT);
    const HHA = calcHHA(cooled, T0, RH);
    const L = calcLossRate(HHA);
    const Y = Math.max(0, Math.min(1, A_rel * (1 - L)));

    const S_total_out = K_solar != null ? +(R * K_solar).toFixed(3) : null;

    results.push({
      R: Math.round(R * 100) / 100,
      Y,
      A_rel,
      L,
      HHA: Math.round(HHA * 10) / 10,
      Tmax_cooled: +(Tmax - deltaT).toFixed(1),
      deltaT: +deltaT.toFixed(1),
      S_total: S_total_out,
    });

    if (Y > bestY) {
      bestY = Y;
      bestIndex = results.length - 1;
    }
  }

  // 近优平台区间
  let plateau: Plateau | null = null;
  if (bestIndex >= 0 && bestY > -Infinity) {
    const near = results.filter((r) => r.Y >= bestY * (1 - CONFIG.PLATEAU_EPSILON));
    if (near.length > 0) {
      plateau = {
        rMin: Math.min(...near.map((r) => r.R)),
        rMax: Math.max(...near.map((r) => r.R)),
      };
    }
  }

  // 最优点：平台下限（省钱优先），无平台则 bestIndex
  let optimum: ResultPoint | null = null;
  if (plateau) {
    optimum = results.find((r) => Math.abs(r.R - plateau!.rMin) < 1e-6) || results[bestIndex];
  } else if (bestIndex >= 0) {
    optimum = results[bestIndex];
  }

  return { results, optimum, plateau, bestIndex, error: null };
}

/** 安全省钱策略：近优平台 1/4 分位；
 *  无平台时取 Y ≥ Ymax×0.95 的最低 R（改进：原版回退 bestIndex 不省钱） */
export function safeSavePoint(
  results: ResultPoint[], bestIndex: number, plateau: Plateau | null,
): ResultPoint {
  if (plateau) {
    const rQuarter = plateau.rMin + (plateau.rMax - plateau.rMin) * CONFIG.PLATEAU_QUARTER;
    let nearestIdx = bestIndex;
    let minDiff = Infinity;
    for (let i = 0; i < results.length; i++) {
      const diff = Math.abs(results[i].R - rQuarter);
      if (diff < minDiff) { minDiff = diff; nearestIdx = i; }
    }
    return results[nearestIdx];
  }
  // 改进回退：取 Y ≥ 95% Ymax 中 R 最小者（省粉剂）
  const bestY = results[bestIndex]?.Y ?? 0;
  const candidates = results.filter((r) => r.Y >= bestY * 0.95);
  if (candidates.length > 0) {
    return candidates.reduce((a, b) => (a.R < b.R ? a : b));
  }
  return results[bestIndex];
}
