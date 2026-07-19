/**
 * 计算器公共 API
 */
export * from './types';
export * from './presets';
export {
  linearInterpolate, dayShape, generateHourlyTemps, generateHourlySolar,
  getCooledTemps, calcHHA, calcLossRate, photosynthCore, calcPhotosynth,
  fritschCarlsonSpline, integrateSpectrum, normalizeProductTable, getTempDrop,
  findOptimalR, safeSavePoint,
} from './engine';
export {
  getSprayerBatches, getTableAdvice, interpolateDilution,
  extractStrategies, evaluatePointWarnings, evaluateEnvWarnings,
  validateParams, calcCostBenefit,
} from './advice';
export type { CostBenefit } from './advice';
export * from './multi-day';

import type { CalcParams } from './types';
import {
  PRESETS, DEFAULT_WEATHER, DEFAULT_PRODUCT_TABLE, DEFAULT_K_MAPPING,
  CONFIG,
} from './presets';

/** 创建默认参数（克瑞森无核 + 夏季高温场景） */
export function createDefaultParams(): CalcParams {
  const p = PRESETS.crimson;
  return {
    LSP: p.LSP,
    LCP: p.LCP,
    T0: p.T0,
    Tmax: DEFAULT_WEATHER.Tmax,
    Tmin: DEFAULT_WEATHER.Tmin,
    D: DEFAULT_WEATHER.D,
    Imax: DEFAULT_WEATHER.Imax,
    RH: DEFAULT_WEATHER.RH,
    calcMode: 'table',
    tableSubMode: 'full',
    k: CONFIG.DEFAULT_K,
    productTable: DEFAULT_PRODUCT_TABLE.map((r) => ({ ...r })),
    kMapping: DEFAULT_K_MAPPING.map((r) => ({ ...r })),
    spectrumPoints: CONFIG.SPECTRAL_DEFAULT_CONTROLS.map((p) => ({ ...p })),
    sprayArea: DEFAULT_WEATHER.sprayArea,
    sprayerCap: DEFAULT_WEATHER.sprayerCap,
    powderPrice: DEFAULT_WEATHER.powderPrice,
    grapePrice: DEFAULT_WEATHER.grapePrice,
    expectedYield: DEFAULT_WEATHER.expectedYield,
  };
}

/** LocalStorage 键 */
export const STORAGE_KEY = 'gcc:v2';
