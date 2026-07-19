# 葡萄大棚降温剂最佳配比计算器 — 项目交接文档

## 一、项目当前状态描述 / 判断

### 项目概述
将原始单文件 HTML 计算器（3604 行）重构为 Next.js 16 + TypeScript + shadcn/ui 的生产级应用。
核心功能：基于光合效益（A_rel）与有害积热（HHA）模型，优化葡萄大棚降温剂的最佳遮阳率 R，
输出可执行的配比处方（兑水比、用粉量、用水量、分批次数、净收益）。

### 当前状态：✅ 稳定可用（v2 首版完成）
- 开发服务器运行正常（端口 3000，无致命错误）
- ESLint 通过，无 TypeScript 报错
- agent-browser QA 全部通过：页面渲染、实时计算、暗色模式、移动端响应、帮助弹窗、k 值模式切换均正常
- 无控制台错误 / hydration 错误

### 技术栈
- Next.js 16 App Router + TypeScript 5
- Tailwind CSS 4 + shadcn/ui（New York）+ Lucide 图标
- Zustand（状态管理 + localStorage 持久化）
- Recharts（图表，替代原版 Chart.js）
- next-themes（暗色模式）

## 二、当前目标 / 已完成的修改 / 验证结果

### 已完成的深度审查与算法改进

#### 1. 算法修复（相对原 HTML 版本）
| 问题 | 原版行为 | 修复后 |
|------|---------|--------|
| **降温量恒定** | dT 全天恒定，低估正午热害、高估夜间降温 | dT(h) = dT_max × (0.7 + 0.3×日照因子)，正午满额、夜间残留（涂膜热惯性）|
| **safeSavePoint 回退** | 无平台时回退 bestIndex（最高 Y，不省钱）| 取 Y ≥ 95% Ymax 中 R 最小者（真正省钱）|
| **表格模式 ratio 插值** | 用 nearestStr 导致兑水比离散跳变 | 统一用 linearInterpolate 后圆整到 0.1 |
| **光谱 K_par 未 clamp** | 1 - R×K_par 可能为负 | Math.min(1, 1-Te) 防负透过率 |
| **喷雾器容量硬编码** | getTableAdvice 内默认 20L | store 层动态注入 params.sprayerCap |

#### 2. 新增功能
- ✅ **暗色模式**：农业绿 + 暖琥珀主题，夜间大棚巡检友好（用户明确要求）
- ✅ **实时计算**：参数变更自动重算（原版需点"计算"按钮），350ms 防抖
- ✅ **配方管理**：保存/载入/删除命名配方（localStorage），支持 JSON 导入导出
- ✅ **净收益分析**：新增葡萄售价 + 预期亩产输入，计算"挽回收益 - 粉剂成本"净收益
- ✅ **帮助文档**：4 标签页（快速上手 / 参数说明 / 模型原理 / 策略解读），含参数含义与模型公式
- ✅ **品种预设扩展**：新增巨峰、红地球（原版仅 3 种）
- ✅ **环境警告增强**：PAR 峰值低于 LSP 时提示"轻度遮阳影响小"

#### 3. 架构重构（消除"屎山"）
- 原版：3604 行单 HTML，CSS/HTML/JS 混杂，全局可变状态，DOM 查询散落
- 新版：分层架构
  - `src/lib/calculator/` — 纯函数计算引擎（types/presets/engine/advice/index）
  - `src/components/calculator/` — React 组件（store/input-panel/output-panel/result-chart 等）
  - 所有计算函数纯函数化，无副作用，可测试
  - TypeScript 全量类型，消除原版 any/隐式类型

#### 4. UI/UX 改进
- shadcn/ui 组件替代手写 CSS（Card/Table/Accordion/Dialog/Tabs/RadioGroup 等）
- 粘性页头 + 粘性页脚（mt-auto + min-h-screen flex flex-col）
- 自定义滚动条（scrollbar-thin）
- 数字等宽对齐（tabular-nums）
- 移动端单列堆叠响应式
- 策略对比表 + 详细处方表分区清晰（divider 行）

### 验证结果（agent-browser QA）
| 检查项 | 结果 |
|--------|------|
| 页面渲染（浅色） | ✅ VLM 评估：布局清晰、无错位、色彩协调 |
| 暗色模式 | ✅ VLM 评估：配色舒适、图表清晰 |
| 实时计算（Tmax 45→50） | ✅ Y 从 0.98→0.77，Tmax_cooled 41→44°C |
| k 值模式切换 | ✅ 显示降温系数输入 + 稀释比映射表 |
| 帮助弹窗 | ✅ 4 标签页正常切换 |
| 移动端（390px） | ✅ VLM 评估：单列堆叠、无溢出 |
| 粘性页脚 | ✅ mt-auto + flex-col 正确 |
| 控制台错误 | ✅ 无 error/warn/hydration |
| ESLint | ✅ 通过 |

## 三、未解决问题或风险，建议下一阶段优先事项

### 已知局限 / 待优化
1. **光谱模式编辑器简化**：当前用 JSON 文本框编辑控制点，原版有可视化拖拽画布。
   建议下一阶段用 SVG/Canvas 实现拖拽式光谱编辑器（高级用户功能）。
2. **净收益 baselineLoss 估算保守**：用 `point.L + 0.3` 近似不施用时的损失率。
   更精确做法是在 findOptimalR 中同时记录 R=0 基准点的 HHA/L。
3. **无 PWA / 离线支持**：田间网络不稳定时可能受影响。建议加 service worker。
4. **无多语言**：当前仅中文。如需英文版可加 next-intl。
5. **无服务端持久化**：配方仅存 localStorage。如需跨设备同步可加 Prisma + API。

### 建议下一阶段优先事项
1. **P0**：可视化光谱拖拽编辑器（提升高级用户体验）
2. **P0**：R=0 基准点精确计算（提升净收益分析准确性）
3. **P1**：多日预报批量计算（输入一周天气，算累积 HHA 与最优喷洒日程）
4. **P1**：PWA 离线支持（田间可用性）
5. **P2**：作业处方单 PDF 导出（打印友好）
6. **P2**：更多品种预设（巨峰已加，可继续扩展红提、藤稔等）

### 文件结构
```
src/
├─ app/
│  ├─ layout.tsx              # 根布局（ThemeProvider + Toaster）
│  ├─ page.tsx                # 首页（渲染 CalculatorClient）
│  └─ globals.css            # 主题变量（浅/暗）+ 滚动条 + 打印样式
├─ lib/calculator/
│  ├─ types.ts               # TypeScript 类型定义
│  ├─ presets.ts             # CONFIG 常量 + 品种预设 + 默认值
│  ├─ engine.ts              # 核心引擎（气温/HHA/光合/光谱/优化）
│  ├─ advice.ts              # 配比建议/策略/警告/校验/净收益
│  └─ index.ts               # 公共 API + createDefaultParams
└─ components/calculator/
   ├─ store.ts               # Zustand store（持久化 + 自动重算）
   ├─ calculator-client.tsx  # 主组件（页头/主体/页脚）
   ├─ input-panel.tsx        # 左侧输入面板
   ├─ output-panel.tsx       # 右侧输出面板
   ├─ result-chart.tsx       # Recharts 综合效益曲线
   ├─ theme-provider.tsx     # next-themes 包装
   ├─ theme-toggle.tsx       # 暗/亮切换按钮
   ├─ help-dialog.tsx        # 使用说明（4 标签页）
   ├─ recipe-manager.tsx     # 配方保存/载入/导入/导出
   ├─ spectrum-editor.tsx    # 可视化光谱拖拽编辑器（SVG）★v2.1新增
   ├─ multi-day-dialog.tsx   # 多日预报批量计算弹窗 ★v2.1新增
   └─ prescription-export.tsx # 作业处方单打印导出 ★v2.1新增
```

---

## v2.1 迭代记录（2026-07-19 cron 第 1 轮）

### 项目当前状态：✅ 稳定可用，功能持续丰富
- 开发服务器运行正常，ESLint 通过，无控制台错误
- agent-browser QA 全部通过：浅色/暗色、光谱拖拽、多日预报、处方单导出均验证

### 本轮完成的改进

#### 1. P0 算法修复：R=0 基准点精确计算
- **问题**：原 `calcCostBenefit` 用 `point.L + 0.3` 近似不施用时的损失率，不精确
- **修复**：`findOptimalR` 新增 `baseline` 字段，精确计算 R=0 时的 HHA/L/Y
- `calcCostBenefit` 接收 baseline 参数，净收益分析现在基于真实对照
- CostBenefit 接口新增 `baselineY`/`afterY` 字段
- UI 新增"不施用 → 施用后"三栏对比卡（L% / Y 值对照）

#### 2. P0 新功能：可视化光谱拖拽编辑器（SVG）
- **替换**：原 JSON 文本框 → 交互式 SVG 拖拽编辑器
- **特性**：
  - 7 个可拖拽控制点（pointer events，支持触屏）
  - 双击空白添加控制点，hover 显示删除按钮（×）
  - 实时 Fritsch-Carlson 样条插值曲线 + 填充
  - 背景叠加：太阳光谱（黄色填充）、植物光合响应（绿色虚线）
  - PAR 区域（400-700nm）高亮标识
  - X 轴下方可见光彩虹色条（波长→RGB 映射）
  - 实时显示 S_total / τ_PAR 积分结果
  - 图例 + 坐标轴 + 拖拽时数值气泡提示
- 文件：`src/components/calculator/spectrum-editor.tsx`（~280 行）

#### 3. P1 新功能：多日预报批量计算
- **场景**：种植户拿到未来 N 天天气预报，决定是否喷洒及最优 R
- **引擎**：`src/lib/calculator/multi-day.ts`
  - `calcMultiDay(weather, R, params)` — 逐日 HHA + 累积 HHA + 累积损失（非线性查表）
  - `findOptimalMultiDayR` — 搜索最优 R（加权 avgY - 0.05×超温天数）
  - `generateDefaultWeek` — 基于当前参数生成 7 天波动预报
- **UI**：`multi-day-dialog.tsx`
  - 逐日天气输入表（日期/Tmax/Tmin/D/Imax/RH，可增删）
  - R 滑块 + "最优"自动应用按钮
  - 4 指标卡（累积HHA / 累积损失 / 平均Y / 超温天数，含基准对照）
  - 减损收益汇总（损失率下降 / 挽回产量 / 挽回收益）
  - 逐日详情表 + 超温警告
- **验证**：7 天预报，R=80% 最优，挽回 1075kg 产量 / ¥8603 收益

#### 4. P2 新功能：作业处方单打印导出
- **方式**：`window.open` + `window.print()`（离线可用，田间友好）
- **内容**：推荐遮阳率大字卡 + 配比建议 + 作业参数表 + 策略对比 + 净收益分析 + 关键参数 + 签字栏
- **样式**：A4 打印优化，农业绿主题，@page margin 12mm
- 用户可"另存为 PDF"或直接打印

#### 5. 样式细节增强
- 新增 4 个 CSS 动画：`animate-value-change`（数字脉冲）、`animate-fade-in`（卡片淡入）、`animate-slide-in`（滑入）、`animate-pulse-soft`（呼吸）
- 最优卡片添加 `animate-fade-in` 入场动画
- 图表升级为**双 Y 轴**：左轴 Y（综合效益，实线）+ 右轴 A_rel（光合保留率，虚线）
- 图例扩展：曲线图例 + 策略点图例统一展示
- 暗色模式输入框文字提亮（oklch 0.97）

### 验证结果
| 检查项 | 结果 |
|--------|------|
| R=0 基准净收益对照 | ✅ 不施用 L=72% → 施用 L=0%，Y 0.28→0.99 |
| 光谱拖拽编辑器 | ✅ VLM：曲线/控制点/网格清晰，7 控制点可拖拽 |
| 光谱积分值 | ✅ S_total=49.5%, τ_PAR=68.1% 实时更新 |
| 多日预报 7 天 | ✅ 累积 HHA / 超温天数 / 减损收益正确计算 |
| 处方单导出 | ✅ 新窗口打开，标题正确，含打印脚本 |
| 双 Y 轴图表 | ✅ VLM：双轴清晰，曲线与图例完整 |
| 暗色模式光谱 | ✅ VLM：深色下曲线/控制点/彩虹条均清晰 |
| 控制台错误 | ✅ 仅 Recharts 宽度警告（cosmetic，无功能影响）|
| ESLint | ✅ 通过 |

### 文件结构更新
```
src/lib/calculator/
├─ multi-day.ts              # ★v2.1 多日预报引擎
└─ (engine.ts 新增 baseline 字段)
src/components/calculator/
├─ spectrum-editor.tsx       # ★v2.1 可视化光谱拖拽编辑器
├─ multi-day-dialog.tsx      # ★v2.1 多日预报弹窗
└─ prescription-export.tsx   # ★v2.1 处方单打印导出
```

### 下一阶段建议优先事项
1. **P1**：PWA 离线支持（service worker + manifest，田间可用性）
2. **P1**：光谱预设库（白涂剂/红涂剂/遮阳网等典型曲线一键加载）
3. **P2**：更多品种预设（藤稔、红提、户太八号等）
4. **P2**：图表点击交互（点击曲线添加自定义策略点，原 HTML 版有此功能）
5. **P2**：处方单 PDF 服务端生成（当前为客户端打印，服务端可更精美）
6. **P3**：多语言（next-intl 英文版）
7. **P3**：跨设备配方同步（Prisma + API）
