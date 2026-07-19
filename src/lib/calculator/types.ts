/**
 * 葡萄大棚降温剂最佳配比计算器 — 类型定义
 *
 * 设计原则：
 * - 所有计算函数为纯函数，无副作用，便于测试与记忆化
 * - 数值单位在字段名/注释中显式标注，避免隐式单位转换
 * - 范围 [0,1] 的比例量用小数（如 R=0.3 表示 30%），百分比仅在 UI 边界转换
 */

/** 计算模式 */
export type CalcMode = 'table' | 'k';

/** 表格模式的子模式（全遮阳率 / 光谱选择） */
export type TableSubMode = 'full' | 'spectral';

/** 品种预设键 */
export type PresetKey = 'crimson' | 'summer-black' | 'shine-muscat' | 'kyoho' | 'red-globe' | 'custom';

/** 产品表行（表格模式） */
export interface ProductRow {
  /** 兑水比 N（1:N） */
  ratioN: number;
  /** 遮阳率百分比 0-100 */
  reflectancePercent: number;
  /** 降温量 °C */
  tempDrop: number;
  /** 每公斤粉剂可喷面积 ㎡/kg */
  coverage: number;
}

/** K 值映射行 */
export interface KMappingRow {
  /** 遮阳率（小数 0-1） */
  r: number;
  /** 兑水比 N（1:N） */
  ratio: number;
}

/** 光谱控制点 */
export interface SpectrumPoint {
  /** 波长 nm */
  x: number;
  /** 反射率 0-1 */
  y: number;
}

/** 完整输入参数 */
export interface CalcParams {
  // ── 植物参数 ──
  /** 光饱和点 μmol/m²/s */
  LSP: number;
  /** 光补偿点 μmol/m²/s */
  LCP: number;
  /** HHA 高温阈值 °C */
  T0: number;

  // ── 天气与大棚 ──
  /** 棚内日最高温 °C */
  Tmax: number;
  /** 棚内日最低温 °C */
  Tmin: number;
  /** 日长 小时 */
  D: number;
  /** 正午棚外 PAR 峰值 μmol/m²/s */
  Imax: number;
  /** 棚内日间均湿 % */
  RH: number;

  // ── 降温剂特性 ──
  /** 计算模式 */
  calcMode: CalcMode;
  /** 表格子模式 */
  tableSubMode: TableSubMode;
  /** 降温系数 k（ΔT = k·R） */
  k: number;
  /** 产品表 */
  productTable: ProductRow[];
  /** K 值映射表 */
  kMapping: KMappingRow[];
  /** 光谱控制点 */
  spectrumPoints: SpectrumPoint[];

  // ── 作业参数 ──
  /** 大棚面积 亩 */
  sprayArea: number;
  /** 喷雾器容量 L/桶 */
  sprayerCap: number;
  /** 粉剂单价 元/kg */
  powderPrice: number;
  /** 葡萄售价 元/kg（用于净收益分析） */
  grapePrice: number;
  /** 预期亩产 kg/亩 */
  expectedYield: number;
}

/** 单个遮阳率点的计算结果 */
export interface ResultPoint {
  /** 遮阳率（小数，已圆整到 0.01） */
  R: number;
  /** 综合效益 Y ∈ [0,1] */
  Y: number;
  /** 相对光合保留率（基准 R=0） */
  A_rel: number;
  /** 产量损失率 ∈ [0,0.85] */
  L: number;
  /** 有害积热 °C²·h */
  HHA: number;
  /** 降温后棚内最高温 °C */
  Tmax_cooled: number;
  /** 降温幅度 °C */
  deltaT: number;
  /** 光谱模式总遮阳率（非光谱模式为 null） */
  S_total: number | null;
}

/** 近优平台区间 */
export interface Plateau {
  rMin: number;
  rMax: number;
}

/** 优化输出 */
export interface OptimizeOutput {
  results: ResultPoint[];
  optimum: ResultPoint | null;
  plateau: Plateau | null;
  bestIndex: number;
  /** R=0 基准点（不施用降温剂），用于净收益分析的精确对照 */
  baseline: ResultPoint | null;
  error: string | null;
}

/** 策略类型 */
export type StrategyType = 'safe_save' | 'max_y' | 'absolute_temp' | 'custom';

/** 策略点 */
export interface StrategyPoint {
  id: string;
  name: string;
  color: string;
  type: StrategyType;
  isBase: boolean;
  data: ResultPoint;
}

/** 配比建议详情 */
export interface AdviceDetail {
  ratio: string;
  coverage: string;
  powderKg: number;
  waterL: number;
  isEstimate: boolean;
}

/** 配比建议结果 */
export interface AdviceResult {
  value: string;
  status: 'ok' | 'insufficient' | 'out_of_range' | 'empty';
  mode?: CalcMode;
  detail: AdviceDetail | null;
  batchInfo: {
    batches: number;
    powderPerBatch: number;
    waterPerBatch: number;
    safeCap: number;
    isEstimate: boolean;
  } | null;
}

/** 警告项 */
export interface Warning {
  level: 'warning' | 'info' | 'danger';
  text: string;
}

/** 校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  invalidFields: string[];
}
