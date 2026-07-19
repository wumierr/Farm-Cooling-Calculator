'use client'

import * as React from 'react'
import { Grape } from 'lucide-react'
import { useCalculatorStore } from './store'
import { InputPanel } from './input-panel'
import { OutputPanel } from './output-panel'
import { ThemeToggle } from './theme-toggle'
import { HelpDialog } from './help-dialog'
import { RecipeManager } from './recipe-manager'
import { MultiDayDialog } from './multi-day-dialog'
import { PrescriptionExport } from './prescription-export'
import { Button } from '@/components/ui/button'

export function CalculatorClient() {
  const { recalculate, validation } = useCalculatorStore()

  // 挂载后立即计算一次（覆盖首次访问无 localStorage 的场景）
  React.useEffect(() => {
    recalculate()
  }, [recalculate])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md no-print">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <Grape className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight truncate">
                葡萄大棚降温剂最佳配比计算器
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                基于光合效益与有害积热（HHA）模型的遮阳率优化工具
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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

      {/* Main */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(360px,420px)_1fr] gap-4">
          <div className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto scrollbar-thin lg:pr-1">
            <InputPanel />
          </div>
          <div className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto scrollbar-thin lg:pr-1">
            <OutputPanel />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card no-print">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            模型：光合效益 × (1 − HHA 损失) · 降温量日照加权 · McCree 光谱
          </span>
          <span className="flex items-center gap-3">
            <span>本工具供决策参考，实际作业请结合田间观测</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
