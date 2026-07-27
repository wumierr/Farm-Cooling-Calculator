'use client'

import * as React from 'react'
import { Grape, SlidersHorizontal, LineChart } from 'lucide-react'
import { useCalculatorStore } from './store'
import { useIsMobile } from '@/hooks/use-mobile'
import { InputPanel } from './input-panel'
import { OutputPanel } from './output-panel'
import { ThemeToggle } from './theme-toggle'
import { HelpDialog } from './help-dialog'
import { RecipeManager } from './recipe-manager'
import { MultiDayDialog } from './multi-day-dialog'
import { PrescriptionExport } from './prescription-export'
import { HistoryDialog } from './history-dialog'
import { CompareDialog } from './compare-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function CalculatorClient() {
  const { recalculate, validation, output } = useCalculatorStore()
  const isMobile = useIsMobile()

  // 挂载后立即计算一次（覆盖首次访问无 localStorage 的场景）
  React.useEffect(() => {
    recalculate()
  }, [recalculate])

  const hasError = validation.errors.length > 0 || Boolean(output?.error)
  const isReady = !hasError && Boolean(output?.optimum)

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── 页头（玻璃拟态） ── */}
      <header className="sticky top-0 z-40 border-b glass no-print">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shrink-0">
              <Grape className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-[15px] sm:text-lg font-bold leading-tight truncate text-gradient-brand">
                  <span className="hidden sm:inline">葡萄大棚降温剂最佳配比计算器</span>
                  <span className="sm:hidden">降温剂计算器</span>
                </h1>
                {isReady && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                    实时
                  </span>
                )}
                {hasError && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full shrink-0">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive" />
                    异常
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                光合效益 × 有害积热（HHA）模型 · 科学决策遮阳率
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            <CompareDialog />
            <HistoryDialog />
            <PrescriptionExport />
            <MultiDayDialog />
            <RecipeManager />
            <HelpDialog />
            <ThemeToggle />
          </div>
        </div>
        {validation.errors.length > 0 && (
          <div className="border-t border-destructive/20 bg-destructive/5 px-4 py-1.5 text-xs text-destructive text-center no-print">
            {validation.errors[0]}
          </div>
        )}
      </header>

      {/* ── 主体：窄屏 Tab / 宽屏分栏 ── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-5 py-3 sm:py-5">
        {isMobile ? (
          <Tabs defaultValue="params" className="w-full">
            <TabsList className="grid grid-cols-2 w-full sticky top-[60px] z-30 mb-3 h-11">
              <TabsTrigger value="params" className="gap-1.5 text-sm">
                <SlidersHorizontal className="h-4 w-4" /> 参数
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-1.5 text-sm">
                <LineChart className="h-4 w-4" /> 结果与图表
              </TabsTrigger>
            </TabsList>
            <TabsContent value="params" className="mt-0 focus-visible:outline-none">
              <InputPanel />
            </TabsContent>
            <TabsContent value="results" className="mt-0 focus-visible:outline-none">
              <OutputPanel />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid grid-cols-[minmax(340px,400px)_1fr] gap-4 lg:gap-5 items-start">
            <div className="lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin lg:pr-1">
              <InputPanel />
            </div>
            <div className="min-w-0">
              <OutputPanel />
            </div>
          </div>
        )}
      </main>

      {/* ── 页脚 ── */}
      <footer className="mt-auto border-t bg-card/60 no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs text-muted-foreground">
          <span>模型：光合效益 × (1 − HHA 损失) · 降温量日照加权 · McCree 光谱</span>
          <span>本工具供决策参考，实际作业请结合田间观测</span>
        </div>
      </footer>
    </div>
  )
}
