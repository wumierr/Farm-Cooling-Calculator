'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createDefaultParams, findOptimalR, extractStrategies, validateParams,
  getTableAdvice, interpolateDilution, evaluateEnvWarnings, calcCostBenefit,
  STORAGE_KEY, PRESETS,
} from '@/lib/calculator'
import type {
  CalcParams, OptimizeOutput, StrategyPoint, AdviceResult, Warning,
  PresetKey, ValidationResult, CostBenefit,
} from '@/lib/calculator'

interface CalculatorState {
  params: CalcParams
  activePreset: PresetKey
  strategyFlags: { max_y: boolean; absolute_temp: boolean }
  /** 用户自定义策略点（点击图表添加的 R 值） */
  customStrategies: number[]

  // 计算结果（由 recalculate 派生）
  output: OptimizeOutput | null
  advice: AdviceResult | null
  strategies: StrategyPoint[]
  strategyWarnings: Warning[]
  envWarnings: Warning[]
  validation: ValidationResult
  costBenefit: CostBenefit | null
  isCalculating: boolean

  // 操作
  setParam: <K extends keyof CalcParams>(key: K, value: CalcParams[K]) => void
  setParams: (partial: Partial<CalcParams>) => void
  applyPreset: (preset: PresetKey) => void
  toggleStrategy: (key: 'max_y' | 'absolute_temp') => void
  /** 设置自定义策略点（单点替换模式：同时仅保留 1 个，点击新位置直接替换旧的） */
  setCustomStrategy: (R: number) => void
  removeCustomStrategy: (R: number) => void
  clearCustomStrategies: () => void
  reset: () => void
  recalculate: () => void
  loadParams: (params: CalcParams, preset?: PresetKey) => void
}

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set, get) => ({
      params: createDefaultParams(),
      activePreset: 'crimson',
      strategyFlags: { max_y: true, absolute_temp: true },
      customStrategies: [],

      output: null,
      advice: null,
      strategies: [],
      strategyWarnings: [],
      envWarnings: [],
      validation: { valid: true, errors: [], invalidFields: [] },
      costBenefit: null,
      isCalculating: false,

      setParam: (key, value) => {
        set((s) => ({ params: { ...s.params, [key]: value } }))
        get().recalculate()
      },

      setParams: (partial) => {
        set((s) => ({ params: { ...s.params, ...partial } }))
        get().recalculate()
      },

      applyPreset: (preset) => {
        if (preset === 'custom') {
          set({ activePreset: 'custom' })
          return
        }
        const p = PRESETS[preset]
        set((s) => ({
          activePreset: preset,
          params: { ...s.params, LSP: p.LSP, LCP: p.LCP, T0: p.T0 },
        }))
        get().recalculate()
      },

      toggleStrategy: (key) => {
        set((s) => ({
          strategyFlags: { ...s.strategyFlags, [key]: !s.strategyFlags[key] },
        }))
        get().recalculate()
      },

      setCustomStrategy: (R) => {
        const rounded = Math.round(R * 100) / 100
        // 单点替换模式：清空已有自定义点，仅保留新点
        set({ customStrategies: [rounded] })
        get().recalculate()
      },

      removeCustomStrategy: (R) => {
        const rounded = Math.round(R * 100) / 100
        set((s) => ({
          customStrategies: s.customStrategies.filter((r) => Math.abs(r - rounded) > 0.005),
        }))
        get().recalculate()
      },

      clearCustomStrategies: () => {
        set({ customStrategies: [] })
        get().recalculate()
      },

      reset: () => {
        const fresh = createDefaultParams()
        set({
          params: fresh,
          activePreset: 'crimson',
          strategyFlags: { max_y: true, absolute_temp: true },
          customStrategies: [],
        })
        get().recalculate()
      },

      loadParams: (params, preset) => {
        set({ params, activePreset: preset ?? 'custom' })
        get().recalculate()
      },

      recalculate: () => {
        const { params, strategyFlags } = get()
        const validation = validateParams(params)
        if (!validation.valid) {
          set({
            validation,
            output: null,
            advice: null,
            strategies: [],
            strategyWarnings: [],
            envWarnings: evaluateEnvWarnings(params),
            costBenefit: null,
          })
          return
        }

        const output = findOptimalR(params)
        if (output.error) {
          set({ validation, output, advice: null, strategies: [], costBenefit: null })
          return
        }

        const { points, warnings } = extractStrategies(output, params, strategyFlags)
        const envWarnings = evaluateEnvWarnings(params)

        // 追加用户自定义策略点（点击图表添加的 R 值）
        const { customStrategies } = get()
        const customPoints: StrategyPoint[] = []
        for (const R of customStrategies) {
          const found = output.results.find((r) => Math.abs(r.R - R) < 0.005)
          if (found) {
            customPoints.push({
              id: `custom_${R}`,
              name: `自定义 ${(R * 100).toFixed(0)}%`,
              color: '#a855f7',
              type: 'custom',
              isBase: false,
              data: found,
            })
          }
        }
        const allStrategies = [...points, ...customPoints]

        // 配比建议（基于 safe_save 基准策略，或 optimum）
        const baseStrategy = points.find((p) => p.type === 'safe_save')
        const basePoint = baseStrategy?.data ?? output.optimum
        let advice: AdviceResult
        const isSpectrum = params.calcMode === 'table' && params.tableSubMode === 'spectral'
        const sTotalOpt = isSpectrum && basePoint ? basePoint.S_total : null

        if (params.calcMode === 'table') {
          advice = getTableAdvice(
            basePoint?.R ?? 0, params.productTable, params.sprayArea, sTotalOpt,
          )
        } else {
          advice = interpolateDilution(
            basePoint?.R ?? 0, params.kMapping, params.sprayArea, params.sprayerCap,
          )
        }

        // 喷雾器容量动态注入（getTableAdvice 内默认 20，这里修正）
        if (advice.detail && advice.batchInfo) {
          const safeCap = params.sprayerCap * 0.8
          const batches = Math.max(1, Math.ceil(advice.detail.waterL / safeCap))
          advice.batchInfo = {
            batches,
            powderPerBatch: advice.detail.powderKg / batches,
            waterPerBatch: advice.detail.waterL / batches,
            safeCap,
            isEstimate: advice.detail.isEstimate,
          }
        }

        const costBenefit = basePoint
          ? calcCostBenefit(basePoint, params, advice.detail, output.baseline)
          : null

        set({
          validation,
          output,
          strategies: allStrategies,
          strategyWarnings: warnings,
          envWarnings,
          advice,
          costBenefit,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        params: s.params,
        activePreset: s.activePreset,
        strategyFlags: s.strategyFlags,
        customStrategies: s.customStrategies,
      }),
      onRehydrateStorage: () => (state) => {
        // 重新水合后立即计算一次
        setTimeout(() => state?.recalculate(), 0)
      },
    },
  ),
)
