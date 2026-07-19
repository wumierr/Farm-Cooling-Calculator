/**
 * 全局配置常量与品种预设
 *
 * ── 实际应用场景取舍说明 ──
 * 本计算器面向葡萄种植户的田间决策，输入数据（天气预报、粉剂性能）本身存在
 * ±10~20% 不确定性。因此模型精度控制在 ±5% 即可，过分精细的数值积分反而
 * 给人虚假的精确感。下面各阈值均来自农学经验值，并在注释中标注来源。
 */
import type { PresetKey, ProductRow, KMappingRow, SpectrumPoint } from './types';

export const CONFIG = {
  // ── 遮阳率搜索空间 ──
  R_MIN: 0.10, // 10% 起步：低于此值降温效果可忽略
  R_MAX: 0.80, // 80% 上限：超过后光合严重不足，且粉剂难均匀
  R_STEP: 0.01, // 1% 步长：71 点，兼顾分辨率与性能

  // ── 逐时积分 ──
  SUNRISE: 6, // 日出时刻（h），可按地区调整
  HOUR_STEP: 0.5, // 积分步长（h），0.5h 足以捕捉正弦曲线
  /** 白天峰值时刻；null=正午对称，14=午后偏热型 */
  DAY_PEAK: null as number | null,

  // ── 光合模型 ──
  /** I=LSP 时光合速率占 Pmax 比例（Michaelis-Menten 推导用） */
  P_AT_LSP: 0.99,

  // ── 近优平台 ──
  PLATEAU_EPSILON: 0.02, // Y ≥ Ymax×(1-ε) 视为近优
  PLATEAU_QUARTER: 0.25, // 安全省钱策略取平台 1/4 分位

  // ── 喷雾器 ──
  SPRAYER_SAFETY_FACTOR: 0.8, // 每次配液不超过标称容量 80%，防溢出

  // ── HHA 与产量损失（经验阈值，来源：设施葡萄热害研究） ──
  HHA_THRESHOLDS: { MILD: 40.0, MODERATE: 150.0, SEVERE: 400.0, SEVERE_FULL: 600.0 },
  LOSS_CAPS: { MILD: 0.15, MODERATE: 0.45, SEVERE: 0.85 },

  // ── 光谱（全遮阳率模式简化系数） ──
  /** 白色降温剂阻红外强于可见光：100% 遮阳下 PAR 仍有 20% 透过 */
  PAR_TRANSMISSION_FACTOR: 0.8,

  // ── 降温模型改进：日照相关系数 ──
  /** 降温量随日照强度变化的权重（0=恒定降温，1=完全正比日照）。
   *  实际降温剂在正午强光下效果更显著，取 0.6 作为折中。
   *  dT(h) = dT_max × (1 - SOLAR_DEPENDENCE×0.5 + SOLAR_DEPENDENCE×0.5×dayShape(h))
   *  这样夜间仍有微弱残留降温（涂膜热惯性），正午达到满额。 */
  SOLAR_DEPENDENCE: 0.6,

  DEBOUNCE_MS: 350, // 实时计算防抖（原版 500ms 偏慢）
  DEFAULT_K: 13.3,
  MU_TO_M2: 666.67,

  // ── 光谱数据（ASTM G173-03 参考光谱，380-1100nm, 10nm 步长, 73 点） ──
  SOLAR_SPECTRUM_DATA: [
    0.22,0.25,0.28,0.31,0.34,0.38,0.42,0.47,0.52,0.58,
    0.64,0.70,0.76,0.82,0.88,0.94,0.98,1.00,0.99,0.96,
    0.92,0.88,0.85,0.83,0.81,0.80,0.79,0.78,0.77,0.76,
    0.75,0.74,0.73,0.71,0.70,0.68,0.66,0.64,0.62,0.60,
    0.58,0.56,0.54,0.52,0.50,0.48,0.46,0.44,0.42,0.40,
    0.38,0.37,0.35,0.34,0.33,0.31,0.30,0.29,0.28,0.27,
    0.26,0.25,0.24,0.23,0.22,0.22,0.21,0.20,0.19,0.19,
    0.18,0.17,0.17,
  ],

  /** McCree 1972 植物光合作用光谱（蓝光 440nm + 红光 660nm 双峰） */
  PLANT_RESPONSE_DEFAULT: [
    0.05,0.08,0.14,0.24,0.38,0.52,0.66,0.78,0.88,0.96,
    0.98,0.94,0.88,0.80,0.72,0.68,0.70,0.76,0.82,0.88,
    0.92,0.95,0.96,0.95,0.92,0.88,0.82,0.76,0.70,0.64,
    0.58,0.52,0.46,0.40,0.34,0.28,0.22,0.16,0.10,0.06,
    0.03,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,
  ],

  /** 白涂剂典型光谱控制点（PAR 低反射 + IR 高反射） */
  SPECTRAL_DEFAULT_CONTROLS: [
    { x: 380, y: 0.15 }, { x: 480, y: 0.18 }, { x: 550, y: 0.22 },
    { x: 700, y: 0.20 }, { x: 780, y: 0.45 }, { x: 950, y: 0.65 },
    { x: 1100, y: 0.60 },
  ] as SpectrumPoint[],

  /** 光谱预设库 — 常见降温剂/遮阳材料典型反射曲线
   *  数据来源：厂商技术资料整理 + 农业光环境研究文献典型值 */
  SPECTRAL_PRESETS: [
    {
      key: 'white-coating',
      name: '白色降温剂',
      desc: 'PAR 低反射、IR 高反射，光合保留好',
      color: '#f8fafc',
      points: [
        { x: 380, y: 0.15 }, { x: 480, y: 0.18 }, { x: 550, y: 0.22 },
        { x: 700, y: 0.20 }, { x: 780, y: 0.45 }, { x: 950, y: 0.65 },
        { x: 1100, y: 0.60 },
      ],
    },
    {
      key: 'yellow-coating',
      name: '黄色降温剂',
      desc: '蓝光段反射略高，红光保留',
      color: '#fde047',
      points: [
        { x: 380, y: 0.25 }, { x: 450, y: 0.30 }, { x: 550, y: 0.20 },
        { x: 660, y: 0.15 }, { x: 780, y: 0.40 }, { x: 950, y: 0.60 },
        { x: 1100, y: 0.55 },
      ],
    },
    {
      key: 'red-coating',
      name: '红色降温剂',
      desc: '蓝绿光反射高，红光透过（适合红光敏感品种）',
      color: '#f87171',
      points: [
        { x: 380, y: 0.35 }, { x: 480, y: 0.40 }, { x: 550, y: 0.35 },
        { x: 620, y: 0.20 }, { x: 680, y: 0.12 }, { x: 780, y: 0.42 },
        { x: 950, y: 0.58 }, { x: 1100, y: 0.52 },
      ],
    },
    {
      key: 'shade-net-black',
      name: '黑色遮阳网',
      desc: '全光谱均匀吸收，光合衰减明显',
      color: '#475569',
      points: [
        { x: 380, y: 0.45 }, { x: 480, y: 0.45 }, { x: 550, y: 0.45 },
        { x: 660, y: 0.45 }, { x: 780, y: 0.48 }, { x: 950, y: 0.50 },
        { x: 1100, y: 0.48 },
      ],
    },
    {
      key: 'shade-net-silver',
      name: '银灰遮阳网',
      desc: '全光谱高反射，降温强但光合损失大',
      color: '#cbd5e1',
      points: [
        { x: 380, y: 0.55 }, { x: 480, y: 0.58 }, { x: 550, y: 0.60 },
        { x: 660, y: 0.58 }, { x: 780, y: 0.62 }, { x: 950, y: 0.68 },
        { x: 1100, y: 0.65 },
      ],
    },
    {
      key: 'diffuse-film',
      name: '散射膜',
      desc: 'PAR 段散射透过，IR 反射适中',
      color: '#a5f3fc',
      points: [
        { x: 380, y: 0.10 }, { x: 480, y: 0.12 }, { x: 550, y: 0.14 },
        { x: 660, y: 0.13 }, { x: 780, y: 0.30 }, { x: 950, y: 0.50 },
        { x: 1100, y: 0.48 },
      ],
    },
  ] as ReadonlyArray<{
    key: string; name: string; desc: string; color: string;
    points: SpectrumPoint[];
  }>,

  /** 光谱模式降温系数：dT ≈ SPECTRAL_K × S_total */
  SPECTRAL_K: 15.0,

  /** K 值模式 coverage 经验映射（兑水比 → 覆盖面积 ㎡/kg） */
  K_MODE_COVERAGE_MAP: [
    { r: 1, c: 100 }, { r: 3, c: 250 }, { r: 5, c: 400 },
    { r: 8, c: 500 }, { r: 12, c: 750 }, { r: 15, c: 900 },
    { r: 20, c: 1200 },
  ],
} as const;

/** 品种预设 — 只含品种特异参数（LSP/LCP/T0）
 *  数据来源：《葡萄栽培学》及设施葡萄栽培手册，LSP/LCP 为各品种光饱和/补偿点典型值 */
export const PRESETS: Record<Exclude<PresetKey, 'custom'>, {
  LSP: number; LCP: number; T0: number; name: string; desc: string;
}> = {
  crimson:              { LSP: 1300, LCP: 50, T0: 37.0, name: '克瑞森无核', desc: '耐热中等，LSP 适中，晚熟鲜食' },
  'summer-black':       { LSP: 1400, LCP: 40, T0: 36.0, name: '夏黑',       desc: '喜光，LSP 较高，早熟无核' },
  'shine-muscat':       { LSP: 1200, LCP: 60, T0: 38.0, name: '阳光玫瑰',   desc: '耐热较好，LSP 偏低，高档品种' },
  kyoho:                { LSP: 1100, LCP: 55, T0: 35.5, name: '巨峰',       desc: '耐热偏弱，T0 较低，主栽四倍体' },
  'red-globe':          { LSP: 1250, LCP: 45, T0: 37.5, name: '红地球',     desc: '耐热较好，LSP 适中，晚熟耐运' },
  fujiminori:           { LSP: 1150, LCP: 50, T0: 35.0, name: '藤稔',       desc: '耐热弱，果大，需精细温控' },
  'hutai-8':            { LSP: 1280, LCP: 48, T0: 36.5, name: '户太八号',   desc: '耐热中等，抗病强，陕西主栽' },
  'nina-queen':         { LSP: 1350, LCP: 42, T0: 36.5, name: '妮娜皇后',   desc: '喜光，高糖度，着色需控温' },
  'centennial-seedless':{ LSP: 1320, LCP: 46, T0: 37.5, name: '世纪无核',   desc: '耐热较好，中熟无核' },
  'autumn-royal':       { LSP: 1260, LCP: 52, T0: 37.0, name: '秋黑',       desc: '耐热中等，晚熟，抗逆性较强' },
};

/** 天气/大棚默认值（夏季高温典型场景） */
export const DEFAULT_WEATHER = {
  Tmax: 45,
  Tmin: 25,
  D: 14,
  Imax: 1700,
  sprayArea: 1.0,
  RH: 60,
  sprayerCap: 20,
  powderPrice: 50,
  grapePrice: 8,
  expectedYield: 1500,
};

/** 产品性能默认数据（遮阳率递减，对应兑水比递增） */
export const DEFAULT_PRODUCT_TABLE: ProductRow[] = [
  { ratioN: 2,  reflectancePercent: 80, tempDrop: 14.0, coverage: 200 },
  { ratioN: 4,  reflectancePercent: 60, tempDrop: 10.0, coverage: 350 },
  { ratioN: 6,  reflectancePercent: 45, tempDrop: 7.0,  coverage: 500 },
  { ratioN: 8,  reflectancePercent: 32, tempDrop: 4.5,  coverage: 650 },
  { ratioN: 10, reflectancePercent: 23, tempDrop: 3.0,  coverage: 800 },
];

/** K 值模式默认映射 */
export const DEFAULT_K_MAPPING: KMappingRow[] = [
  { r: 0.15, ratio: 10 },
  { r: 0.25, ratio: 8 },
  { r: 0.35, ratio: 5 },
];

/** 策略定义 */
export const STRATEGY_DEFS = {
  safe_save:     { name: '安全省钱 (基准)', color: '#2d6a4f', isBase: true },
  max_y:         { name: '最高效益',        color: '#c0392b', isBase: false },
  absolute_temp: { name: '绝对保温度',       color: '#0ea5e9', isBase: false },
} as const;
