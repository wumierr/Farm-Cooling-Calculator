'use client'

import * as React from 'react'
import { HelpCircle, BookOpen, FlaskConical, Sun, Droplets, TrendingUp } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="使用说明" title="使用说明">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            计算器使用说明
          </DialogTitle>
          <DialogDescription>
            理解模型原理与参数含义，做出科学决策
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="quick" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quick">快速上手</TabsTrigger>
            <TabsTrigger value="params">参数说明</TabsTrigger>
            <TabsTrigger value="model">模型原理</TabsTrigger>
            <TabsTrigger value="strategy">策略解读</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[55vh] pr-4">
            <TabsContent value="quick" className="space-y-3 text-sm leading-relaxed mt-3">
              <h4 className="font-semibold text-base">三步决策</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li><b className="text-foreground">选品种</b>：点击顶部预设按钮，自动填入该品种的 LSP/LCP/T0</li>
                <li><b className="text-foreground">填天气</b>：输入棚内实测/预报的 Tmax、Tmin、日长、PAR 峰值、湿度</li>
                <li><b className="text-foreground">填降温剂数据</b>：表格模式填产品说明书数据（兑水比/遮阳率/降温量/喷洒面积）</li>
              </ol>
              <p className="text-muted-foreground">
                参数变更后自动重算（约 350ms 防抖）。右侧图表实时显示综合效益 Y 随遮阳率 R 的变化曲线。
              </p>
              <h4 className="font-semibold text-base pt-2">阅读结果</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><b className="text-foreground">最优遮阳率</b>：综合效益最高（省钱优先取平台下限）</li>
                <li><b className="text-foreground">近优区间</b>：黄色带，区间内 Y 接近最大值，可灵活选择</li>
                <li><b className="text-foreground">配比建议</b>：直接给出兑水比、用粉量、用水量、分批次数</li>
              </ul>
            </TabsContent>

            <TabsContent value="params" className="space-y-3 text-sm leading-relaxed mt-3">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-1.5"><FlaskConical className="h-4 w-4 text-primary" />植物参数</h4>
                <dl className="space-y-1.5 text-muted-foreground pl-5">
                  <div><dt className="inline font-medium text-foreground">LSP（光饱和点）</dt>：光合速率不再随光强增加的临界点。喜光品种高（夏黑 1400），耐阴品种低。</div>
                  <div><dt className="inline font-medium text-foreground">LCP（光补偿点）</dt>：光合=呼吸的临界点，低于此光强植物净光合为零。</div>
                  <div><dt className="inline font-medium text-foreground">T₀（HHA 阈值）</dt>：开始累积有害积热的温度，品种耐热性越强越高。</div>
                </dl>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-1.5"><Sun className="h-4 w-4 text-primary" />天气参数</h4>
                <dl className="space-y-1.5 text-muted-foreground pl-5">
                  <div><dt className="inline font-medium text-foreground">Tmax/Tmin</dt>：棚内日最高/最低温（注意是棚内，通常比室外高 5-10°C）</div>
                  <div><dt className="inline font-medium text-foreground">D（日长）</dt>：有效光照时长，夏季约 13-14h，冬季 9-10h</div>
                  <div><dt className="inline font-medium text-foreground">Imax（PAR 峰值）</dt>：正午光合有效辐射，晴天约 1600-2000 μmol/m²/s</div>
                  <div><dt className="inline font-medium text-foreground">RH（湿度）</dt>：日间均湿，高湿加剧热害（蒸腾受阻）</div>
                </dl>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-1.5"><Droplets className="h-4 w-4 text-primary" />降温剂参数</h4>
                <dl className="space-y-1.5 text-muted-foreground pl-5">
                  <div><dt className="inline font-medium text-foreground">表格模式</dt>：填写产品说明书实测数据，最准确（推荐）</div>
                  <div><dt className="inline font-medium text-foreground">k 值模式</dt>：仅用线性 ΔT=k·R，适合无完整数据时快速估算</div>
                  <div><dt className="inline font-medium text-foreground">光谱模式</dt>：高级用户可自定义反射光谱，精确计算 PAR 透过率</div>
                </dl>
              </div>
            </TabsContent>

            <TabsContent value="model" className="space-y-3 text-sm leading-relaxed mt-3">
              <h4 className="font-semibold text-base">综合效益 Y = A_rel × (1 - L)</h4>
              <p className="text-muted-foreground">
                Y 衡量"保留多少光合产能 × 规避多少热害损失"，取值 [0,1]。
              </p>
              <h4 className="font-semibold text-base pt-1">A_rel（相对光合保留率）</h4>
              <p className="text-muted-foreground">
                以 R=0（不遮阳）为基准 1.0，遮阳后 PAR 透过减少，按 Michaelis-Menten 光合响应曲线积分全天光合量。
                白色降温剂阻红外强于可见光，故 PAR 衰减系数取 0.8（100% 遮阳下 PAR 仍有 20% 透过）。
              </p>
              <h4 className="font-semibold text-base pt-1">L（产量损失率）</h4>
              <p className="text-muted-foreground">
                基于有害积热 HHA = Σ(T-T₀)² × 湿度系数 × 步长，分段线性映射到损失率（轻度 15% / 中度 45% / 重度 85% 封顶）。
              </p>
              <h4 className="font-semibold text-base pt-1">降温模型（改进）</h4>
              <p className="text-muted-foreground">
                降温量随日照加权：dT(h) = dT_max × (0.7 + 0.3×日照因子)，正午满额、夜间残留（涂膜热惯性）。
                比恒定降温更贴合实际。
              </p>
              <h4 className="font-semibold text-base pt-1">精度说明</h4>
              <p className="text-muted-foreground text-xs">
                本工具面向田间决策，输入数据（天气预报、粉剂性能）本身有 ±10-20% 不确定性，
                模型精度控制在 ±5% 即可。过分精细的数值积分会给人虚假精确感。
              </p>
            </TabsContent>

            <TabsContent value="strategy" className="space-y-3 text-sm leading-relaxed mt-3">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" />三种策略对比</h4>
                <div className="space-y-2 pl-3">
                  <div className="border-l-2 border-primary pl-3">
                    <b>安全省钱（基准）</b>：取近优平台 1/4 分位，用更少粉剂达到 98% 最优效益。推荐大多数场景。
                  </div>
                  <div className="border-l-2 border-red-500 pl-3">
                    <b>最高效益</b>：取 Y 最大点，不计成本追求最高综合效益。适合高价值品种或极端天气。
                  </div>
                  <div className="border-l-2 border-sky-500 pl-3">
                    <b>绝对保温度</b>：在 Tmax_cooled ≤ T₀ 的安全范围内取效益最高点。保证不热害优先。
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-accent/50 p-3 text-xs text-accent-foreground">
                <b>实务建议</b>：近优区间（黄色带）内的任何配比都接近最优。
                预算紧、人工少 → 选下限；天气更热、品种更怕热 → 选上限。
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
