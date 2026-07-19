/**
 * 配比建议、策略提取、警告评估、参数校验
 */
import { CONFIG, STRATEGY_DEFS } from './presets';
import { linearInterpolate, normalizeProductTable, safeSavePoint } from './engine';
import type {
  CalcParams, AdviceResult, StrategyPoint, Warning, ValidationResult,
  ResultPoint, OptimizeOutput,
} from './types';

/* ================================================================
   喷雾器分批
   ================================================================ */

export function getSprayerBatches(
  powderKg: number, waterL: number, sprayerCap: number, isEstimate: boolean,
) {
  if (!sprayerCap || sprayerCap <= 0) {
    return { batches: 0, powderPerBatch: 0, waterPerBatch: 0, safeCap: 0, isEstimate };
  }
  const safeCap = sprayerCap * CONFIG.SPRAYER_SAFETY_FACTOR;
  const batches = Math.max(1, Math.ceil(waterL / safeCap));
  return {
    batches,
    powderPerBatch: powderKg / batches,
    waterPerBatch: waterL / batches,
    safeCap,
    isEstimate,
  };
}

/* ================================================================
   表格模式配比建议
   ================================================================ */

/** 表格模式建议（改进：ratio 用线性插值而非 nearestStr，避免离散跳变） */
export function getTableAdvice(
  Ropt: number, rawProductTable: CalcParams['productTable'],
  sprayAreaMu: number, sTotalOpt: number | null = null,
): AdviceResult {
  if (!rawProductTable || rawProductTable.length < 2) {
    return { value: '产品数据至少需要 2 行', status: 'insufficient', detail: null, batchInfo: null };
  }

  const productTable = normalizeProductTable(rawProductTable);
  const refs = productTable.map((r) => r.reflectance);
  const rMin = Math.min(...refs);
  const rMax = Math.max(...refs);
  const lookupVal = sTotalOpt != null ? sTotalOpt : Ropt;

  if (lookupVal < rMin || lookupVal > rMax) {
    const p = (v: number) => (v * 100).toFixed(0) + '%';
    if (sTotalOpt != null) {
      return {
        value: `光谱总遮阳率 S_total=${p(sTotalOpt)} 超出产品数据范围 [${p(rMin)}–${p(rMax)}]，请调整光谱曲线或补充产品数据`,
        status: 'out_of_range', detail: null, batchInfo: null,
      };
    }
    return {
      value: `R_opt 超出产品数据范围 [${p(rMin)}–${p(rMax)}]，请扩展产品数据`,
      status: 'out_of_range', detail: null, batchInfo: null,
    };
  }

  // 改进：ratioN 线性插值后圆整到 0.1
  const ratioN = linearInterpolate(productTable, 'reflectance', 'ratioN', lookupVal);
  const coverage = linearInterpolate(productTable, 'reflectance', 'coverage', lookupVal);
  const totalM2 = (sprayAreaMu || 1) * CONFIG.MU_TO_M2;
  const powderKg = totalM2 / coverage;
  const waterL = powderKg * ratioN;

  const detail = {
    ratio: `1:${ratioN.toFixed(1)}`,
    coverage: `${coverage.toFixed(0)} ㎡/kg`,
    powderKg,
    waterL,
    isEstimate: false,
  };

  const batchInfo = getSprayerBatches(powderKg, waterL, 20, false);

  return {
    value: [
      `兑水比 1:${ratioN.toFixed(1)}`,
      `每 kg 粉喷 ${coverage.toFixed(0)} ㎡`,
      `共需 ${powderKg.toFixed(1)} kg 粉 + ${waterL.toFixed(0)} L 水`,
    ].join('  ·  '),
    status: 'ok',
    detail,
    batchInfo: { ...batchInfo, isEstimate: false },
  };
}

/* ================================================================
   K 值模式配比建议
   ================================================================ */

export function interpolateDilution(
  Ropt: number, mapping: CalcParams['kMapping'], sprayAreaMu: number,
  sprayerCap: number,
): AdviceResult {
  const muToM2 = (sprayAreaMu || 1) * CONFIG.MU_TO_M2;

  if (!mapping || mapping.length === 0) {
    return { value: '请填写稀释比映射表', status: 'empty', mode: 'k', detail: null, batchInfo: null };
  }
  if (mapping.length < 2) {
    return { value: '请至少填写两组映射数据', status: 'insufficient', mode: 'k', detail: null, batchInfo: null };
  }

  const sorted = [...mapping].sort((a, b) => a.r - b.r);

  if (Ropt < sorted[0].r || Ropt > sorted[sorted.length - 1].r) {
    const p = (v: number) => (v * 100).toFixed(0) + '%';
    return {
      value: `R_opt 超出映射范围 [${p(sorted[0].r)}–${p(sorted[sorted.length - 1].r)}]`,
      status: 'out_of_range', mode: 'k', detail: null, batchInfo: null,
    };
  }

  // 线性插值 ratio
  let lo = sorted[0];
  let hi = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (Ropt >= sorted[i].r && Ropt <= sorted[i + 1].r) {
      lo = sorted[i];
      hi = sorted[i + 1];
      break;
    }
  }
  const ratio = Math.abs(hi.r - lo.r) < 1e-9
    ? lo.ratio
    : lo.ratio + ((Ropt - lo.r) / (hi.r - lo.r)) * (hi.ratio - lo.ratio);

  // 估算 coverage
  const ratioCovg = CONFIG.K_MODE_COVERAGE_MAP;
  const ri = Math.max(1, Math.min(20, ratio));
  const estCoverage = Math.max(50, Math.min(5000, linearInterpolate(ratioCovg, 'r', 'c', ri)));

  const powderKg = muToM2 / estCoverage;
  const waterL = powderKg * ratio;
  const detail = {
    ratio: `1:${ratio.toFixed(1)}`,
    coverage: `${estCoverage.toFixed(0)} ㎡/kg (估算)`,
    powderKg,
    waterL,
    isEstimate: true,
  };
  const batchInfo = getSprayerBatches(powderKg, waterL, sprayerCap, true);

  return {
    value: `建议兑水比例 1:${ratio.toFixed(1)}`,
    status: 'ok', mode: 'k', detail, batchInfo,
  };
}

/* ================================================================
   策略提取
   ================================================================ */

export function extractStrategies(
  output: OptimizeOutput, params: CalcParams,
  enabledFlags: { max_y: boolean; absolute_temp: boolean },
): { points: StrategyPoint[]; warnings: Warning[] } {
  const points: StrategyPoint[] = [];
  const warnings: Warning[] = [];
  const { results, bestIndex, plateau } = output;
  if (!results || results.length === 0) return { points, warnings };

  const baseData = safeSavePoint(results, bestIndex, plateau);
  points.push({
    id: 'safe_save', name: STRATEGY_DEFS.safe_save.name,
    color: STRATEGY_DEFS.safe_save.color, type: 'safe_save',
    isBase: true, data: baseData,
  });

  if (enabledFlags.max_y && bestIndex >= 0) {
    points.push({
      id: 'max_y', name: STRATEGY_DEFS.max_y.name,
      color: STRATEGY_DEFS.max_y.color, type: 'max_y',
      isBase: false, data: results[bestIndex],
    });
  }

  if (enabledFlags.absolute_temp) {
    const safeResults = results.filter((r) => r.Tmax_cooled <= params.T0 + 0.05);
    if (safeResults.length === 0) {
      warnings.push({
        level: 'warning',
        text: '当前气候极端，降温剂无法保证棚温降至阈值以下，建议结合遮阳网或通风措施',
      });
    } else {
      const bestInSafe = safeResults.reduce((a, b) => (a.Y > b.Y ? a : b));
      points.push({
        id: 'absolute_temp', name: STRATEGY_DEFS.absolute_temp.name,
        color: STRATEGY_DEFS.absolute_temp.color, type: 'absolute_temp',
        isBase: false, data: bestInSafe,
      });
    }
  }

  return { points, warnings };
}

/* ================================================================
   警告评估
   ================================================================ */

export function evaluatePointWarnings(point: StrategyPoint, params: CalcParams): Warning[] {
  const warnings: Warning[] = [];
  const { data } = point;
  if (data.Tmax_cooled > params.T0) {
    warnings.push({
      level: 'warning',
      text: `降温后棚温仍达 ${data.Tmax_cooled}°C，超过 HHA 阈值 (${params.T0}°C)，存在热害风险`,
    });
  }
  if (data.A_rel < 0.6) {
    warnings.push({
      level: 'warning',
      text: `光合保留率仅 ${(data.A_rel * 100).toFixed(0)}%，过度遮阳可能严重影响产量`,
    });
  }
  if (data.L > 0.2) {
    warnings.push({
      level: 'warning',
      text: `理论产量损失率达 ${(data.L * 100).toFixed(0)}%，建议结合物理降温措施`,
    });
  }
  if (data.R >= CONFIG.R_MAX - 0.005) {
    warnings.push({
      level: 'info',
      text: '该策略遮阳率已达系统上限，可能仍不满足需求',
    });
  }
  return warnings;
}

export function evaluateEnvWarnings(params: CalcParams): Warning[] {
  const env: Warning[] = [];
  if (params.Tmax > 50) {
    env.push({
      level: 'danger',
      text: `棚内日最高温 ${params.Tmax}°C 属极端高温，植物生理机能可能已受不可逆损伤`,
    });
  }
  if (params.RH > 85) {
    env.push({
      level: 'warning',
      text: `棚内日间均湿 ${params.RH}% 过高，阻碍蒸腾，建议加强通风`,
    });
  }
  if (params.Tmin < 10) {
    env.push({
      level: 'info',
      text: `夜间最低温 ${params.Tmin}°C 偏低，需关注冷害风险`,
    });
  }
  if (params.Imax < params.LSP) {
    env.push({
      level: 'info',
      text: `PAR 峰值 (${params.Imax}) 低于光饱和点 (${params.LSP})，轻度遮阳对光合影响较小`,
    });
  }
  return env;
}

/* ================================================================
   参数校验
   ================================================================ */

export function validateParams(params: CalcParams): ValidationResult {
  const errors: string[] = [];
  const invalidFields: string[] = [];

  const num = (v: unknown): v is number => typeof v === 'number' && !isNaN(v);

  if (!num(params.LSP) || params.LSP < 500 || params.LSP > 2500) {
    errors.push('光饱和点 (LSP) 应在 500-2500 之间'); invalidFields.push('LSP');
  }
  if (!num(params.LCP) || params.LCP < 1 || params.LCP > 500) {
    errors.push('光补偿点 (LCP) 应在 1-500 之间'); invalidFields.push('LCP');
  }
  if (num(params.LSP) && num(params.LCP) && params.LSP <= params.LCP) {
    errors.push('光饱和点 (LSP) 必须大于光补偿点 (LCP)');
  }
  if (!num(params.T0) || params.T0 < 30 || params.T0 > 45) {
    errors.push('HHA 高温阈值 (T0) 应在 30-45°C 之间'); invalidFields.push('T0');
  }
  if (!num(params.Tmax) || params.Tmax < 20 || params.Tmax > 60) {
    errors.push('日最高温 (Tmax) 应在 20-60°C 之间'); invalidFields.push('Tmax');
  }
  if (!num(params.Tmin) || params.Tmin < 5 || params.Tmin > 40) {
    errors.push('日最低温 (Tmin) 应在 5-40°C 之间'); invalidFields.push('Tmin');
  }
  if (num(params.Tmax) && num(params.Tmin) && params.Tmax <= params.Tmin) {
    errors.push('日最高温 (Tmax) 必须大于日最低温 (Tmin)');
  }
  if (!num(params.D) || params.D < 8 || params.D > 16) {
    errors.push('日长 (D) 应在 8-16 小时之间'); invalidFields.push('D');
  }
  if (!num(params.Imax) || params.Imax < 500 || params.Imax > 2500) {
    errors.push('PAR 峰值 (Imax) 应在 500-2500 之间'); invalidFields.push('Imax');
  }
  if (!num(params.RH) || params.RH < 10 || params.RH > 100) {
    errors.push('日均湿度 (RH) 应在 10-100% 之间'); invalidFields.push('RH');
  }
  if (params.calcMode === 'k' && (!num(params.k) || params.k < 5 || params.k > 25)) {
    errors.push('降温系数 (k) 应在 5-25 之间'); invalidFields.push('k');
  }
  if (!num(params.sprayArea) || params.sprayArea <= 0 || params.sprayArea > 500) {
    errors.push('大棚面积应在 0.1-500 亩之间'); invalidFields.push('sprayArea');
  }
  if (!num(params.sprayerCap) || params.sprayerCap < 1 || params.sprayerCap > 2000) {
    errors.push('喷雾器容量应在 1-2000 L 之间'); invalidFields.push('sprayerCap');
  }
  if (!num(params.powderPrice) || params.powderPrice < 0 || params.powderPrice > 10000) {
    errors.push('粉剂单价应在 0-10000 元/kg 之间'); invalidFields.push('powderPrice');
  }

  // 产品表物理趋势校验
  if (params.calcMode === 'table' && params.productTable.length >= 2) {
    const sorted = [...params.productTable].sort(
      (a, b) => a.reflectancePercent - b.reflectancePercent,
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      if (curr.tempDrop > next.tempDrop) {
        errors.push('产品数据物理冲突：遮阳率增加(变浓)时，降温量不能下降');
        break;
      }
      if (curr.ratioN < next.ratioN) {
        errors.push('产品数据物理冲突：遮阳率增加(变浓)时，兑水比应减小');
        break;
      }
      if (curr.coverage < next.coverage) {
        errors.push('产品数据物理冲突：遮阳率增加(变浓)时，每kg喷洒面积应减小');
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors, invalidFields };
}

/* ================================================================
   净收益分析（新功能）
   ================================================================ */

export interface CostBenefit {
  /** 粉剂总成本 元 */
  powderCost: number;
  /** 减损挽回的产量 kg */
  savedYieldKg: number;
  /** 减损挽回收益 元 */
  savedRevenue: number;
  /** 净收益 元 = 挽回收益 - 粉剂成本 */
  netBenefit: number;
  /** 不施用降温剂的产量损失率 */
  baselineLoss: number;
  /** 施用后产量损失率 */
  afterLoss: number;
  /** 不施用时的综合效益 Y（用于对比） */
  baselineY: number;
  /** 施用后的综合效益 Y */
  afterY: number;
}

/** 计算某策略相对"不施用"的净收益
 *  使用 findOptimalR 返回的 baseline（R=0 精确点）作为对照 */
export function calcCostBenefit(
  point: ResultPoint, params: CalcParams, adviceDetail: AdviceResult['detail'],
  baseline?: ResultPoint | null,
): CostBenefit | null {
  if (!adviceDetail) return null;
  const totalYield = (params.expectedYield || 0) * (params.sprayArea || 1);
  // 精确基准：R=0 时的 HHA/L（来自 findOptimalR 的 baseline 字段）
  // 若无 baseline（兼容旧调用），退化为保守估计
  const baselineLoss = baseline ? baseline.L : Math.min(0.85, point.L + 0.3);
  const baselineY = baseline ? baseline.Y : 1 - baselineLoss;
  const savedYieldKg = totalYield * (baselineLoss - point.L);
  const savedRevenue = savedYieldKg * (params.grapePrice || 0);
  const powderCost = adviceDetail.powderKg * (params.powderPrice || 0);
  return {
    powderCost,
    savedYieldKg,
    savedRevenue,
    netBenefit: savedRevenue - powderCost,
    baselineLoss,
    afterLoss: point.L,
    baselineY,
    afterY: point.Y,
  };
}

/** 成本效益曲线点 — 用于不同 R 下的净收益对比图 */
export interface CostBenefitPoint {
  R: number
  Rlabel: string
  netBenefit: number
  savedRevenue: number
  powderCost: number
  /** 是否盈利（净收益 > 0） */
  profitable: boolean
  /** 盈利部分（netBenefit > 0 时为 netBenefit，否则 0）— 用于绿色面积 */
  profitArea: number
  /** 亏损部分（netBenefit < 0 时为 netBenefit，否则 0）— 用于红色面积 */
  lossArea: number
}

/** 计算所有 R 的净收益曲线（用于成本效益对比图）
 *  简化版：不依赖 adviceDetail，直接用 productTable/kMapping 估算粉剂量 */
export function calcCostBenefitCurve(
  results: ResultPoint[], params: CalcParams, baseline?: ResultPoint | null,
): CostBenefitPoint[] {
  const totalYield = (params.expectedYield || 0) * (params.sprayArea || 1);
  const baselineLoss = baseline ? baseline.L : 0.5;
  const muToM2 = (params.sprayArea || 1) * 666.67;

  return results.map((r) => {
    const savedYieldKg = totalYield * (baselineLoss - r.L);
    const savedRevenue = savedYieldKg * (params.grapePrice || 0);

    // 估算粉剂量（简化：用 R 查表或 k 模式）
    let powderKg = 0;
    if (params.calcMode === 'table' && params.productTable.length >= 2) {
      const sorted = [...params.productTable].sort((a, b) => a.reflectancePercent - b.reflectancePercent);
      const rMin = sorted[0].reflectancePercent / 100;
      const rMax = sorted[sorted.length - 1].reflectancePercent / 100;
      if (r.R >= rMin && r.R <= rMax) {
        let lo = sorted[0], hi = sorted[sorted.length - 1];
        for (let i = 0; i < sorted.length - 1; i++) {
          const rl = sorted[i].reflectancePercent / 100;
          const rh = sorted[i + 1].reflectancePercent / 100;
          if (r.R >= rl && r.R <= rh) { lo = sorted[i]; hi = sorted[i + 1]; break; }
        }
        const rl = lo.reflectancePercent / 100, rh = hi.reflectancePercent / 100;
        const t = Math.abs(rh - rl) < 1e-9 ? 0 : (r.R - rl) / (rh - rl);
        const coverage = lo.coverage + t * (hi.coverage - lo.coverage);
        powderKg = muToM2 / Math.max(1, coverage);
      }
    } else if (params.calcMode === 'k' && params.kMapping.length >= 2) {
      const sorted = [...params.kMapping].sort((a, b) => a.r - b.r);
      if (r.R >= sorted[0].r && r.R <= sorted[sorted.length - 1].r) {
        let lo = sorted[0], hi = sorted[sorted.length - 1];
        for (let i = 0; i < sorted.length - 1; i++) {
          if (r.R >= sorted[i].r && r.R <= sorted[i + 1].r) { lo = sorted[i]; hi = sorted[i + 1]; break; }
        }
        const ratio = Math.abs(hi.r - lo.r) < 1e-9 ? lo.ratio : lo.ratio + (r.R - lo.r) / (hi.r - lo.r) * (hi.ratio - lo.ratio);
        const ri = Math.max(1, Math.min(20, ratio));
        const covMap = [{ r: 1, c: 100 }, { r: 3, c: 250 }, { r: 5, c: 400 }, { r: 8, c: 500 }, { r: 12, c: 750 }, { r: 15, c: 900 }, { r: 20, c: 1200 }];
        let clo = covMap[0], chi = covMap[covMap.length - 1];
        for (let i = 0; i < covMap.length - 1; i++) {
          if (ri >= covMap[i].r && ri <= covMap[i + 1].r) { clo = covMap[i]; chi = covMap[i + 1]; break; }
        }
        const coverage = clo.c + (ri - clo.r) / (chi.r - clo.r) * (chi.c - clo.c);
        powderKg = muToM2 / Math.max(1, coverage);
      }
    }

    const powderCost = powderKg * (params.powderPrice || 0);
    const netBenefit = savedRevenue - powderCost;
    return {
      R: r.R,
      Rlabel: `${(r.R * 100).toFixed(0)}%`,
      netBenefit,
      savedRevenue,
      powderCost,
      profitable: netBenefit > 0,
      profitArea: netBenefit > 0 ? netBenefit : 0,
      lossArea: netBenefit < 0 ? netBenefit : 0,
    };
  });
}
