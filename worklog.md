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
   └─ recipe-manager.tsx     # 配方保存/载入/导入/导出
```
