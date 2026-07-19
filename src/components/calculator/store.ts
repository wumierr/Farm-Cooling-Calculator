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

      reset: () => {
        const fresh = createDefaultParams()
        set({
          params: fresh,
          activePreset: 'crimson',
          strategyFlags: { max_y: true, absolute_temp: true },
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

        const costBenefit = basePoint ? calcCostBenefit(basePoint, params, advice.detail) : null

        set({
          validation,
          output,
          strategies: points,
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
      }),
      onRehydrateStorage: () => (state) => {
        // 重新水合后立即计算一次
        setTimeout(() => state?.recalculate(), 0)
      },
    },
  ),
)
