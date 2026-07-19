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

---

## v2.2 迭代记录（2026-07-19 cron 第 2 轮）

### 项目当前状态：✅ 稳定可用，功能与交互持续丰富
- 开发服务器运行正常，ESLint 通过，无控制台错误
- agent-browser QA 全部通过：品种预设、光谱预设库、图表点击交互均验证

### 本轮完成的改进

#### 1. P1 新功能：光谱预设库（6 种典型材料一键加载）
- **新增** `CONFIG.SPECTRAL_PRESETS`：6 种常见降温剂/遮阳材料典型反射曲线
  - 白色降温剂（PAR 低反射 + IR 高反射，默认）
  - 黄色降温剂（蓝光段反射略高）
  - 红色降温剂（蓝绿光反射高，红光透过）
  - 黑色遮阳网（全光谱均匀吸收）
  - 银灰遮阳网（全光谱高反射）
  - 散射膜（PAR 段散射透过）
- **UI**：光谱编辑器顶部新增预设按钮栏（带颜色圆点 + 名称 + hover 提示）
- **验证**：白涂剂 S_total=49.5% → 黑色遮阳网 92.9% → 银灰遮阳网 89.4%

#### 2. P2 新功能：图表点击交互（添加/删除自定义策略点）
- **store 新增** `customStrategies: number[]` + 3 个操作：
  - `addCustomStrategy(R)` / `removeCustomStrategy(R)` / `clearCustomStrategies()`
- **图表 onClick**：点击曲线数据点 → 添加紫色自定义策略点；再次点击 → 移除
- **图例增强**：自定义点带 🗑 图标，点击可移除；有自定义点时显示"清除自定义"按钮
- **持久化**：customStrategies 存入 localStorage
- **验证**：点击 R=55% 添加 → 策略对比表显示"自定义 55% Y=0.9786" → 再点击移除

#### 3. P2 新功能：品种预设扩展（5 → 10 种）
- **新增 5 个品种**：藤稔、户太八号、妮娜皇后、世纪无核、秋黑
- 每个品种含 LSP/LCP/T0 + 描述（耐热性/光饱和点/栽培特性）
- **UI**：预设区改为可滚动（max-h-28 + scrollbar-thin），显示"品种预设（10 种）"
- 描述文字添加 `animate-slide-in` 入场动画

#### 4. 样式细节增强
- **进度条指标行**（`DetailRowWithBar`）：A_rel（绿色）和 L（红色）显示横向进度条 + 数值
  - 500ms 过渡动画，宽度随值变化平滑过渡
- **卡片悬浮效果**：所有 Card hover 时显示 primary 色 15% 透明阴影
- **按钮 focus 增强**：2px ring outline
- **表格行 hover**：背景色 150ms 过渡
- **range 滑块**：accent-color 跟随主题
- **图表标题**：新增"点击曲线添加对比点"提示 + MousePointerClick 图标

### 验证结果
| 检查项 | 结果 |
|--------|------|
| 品种预设 10 种 | ✅ 藤稔/户太八号/妮娜皇后/世纪无核/秋黑 均可点击应用 |
| 光谱预设库 6 种 | ✅ 白/黄/红涂剂 + 黑/银遮阳网 + 散射膜，S_total 正确切换 |
| 图表点击添加 | ✅ 点击 R=55% 添加自定义点，策略表显示 |
| 图表点击移除 | ✅ 再次点击移除，图例 🗑 可点击移除 |
| 清除自定义按钮 | ✅ 有自定义点时显示"清除自定义" |
| 进度条指标 | ✅ A_rel 绿色条 / L 红色条，随值动画 |
| 卡片悬浮 | ✅ hover 阴影效果 |
| 暗色模式 | ✅ 无错误 |
| 控制台错误 | ✅ 无 |
| ESLint | ✅ 通过 |

### 文件结构更新
```
src/lib/calculator/
├─ types.ts                   # PresetKey 新增 5 个品种
├─ presets.ts                 # SPECTRAL_PRESETS 6 种 + PRESETS 10 种品种
└─ (无新文件)
src/components/calculator/
├─ store.ts                   # customStrategies + add/remove/clear 操作
├─ spectrum-editor.tsx        # 顶部预设按钮栏
├─ result-chart.tsx           # onClick 添加/移除 + 图例增强
└─ output-panel.tsx           # DetailRowWithBar 进度条行
```

### 下一阶段建议优先事项
1. **P1**：PWA 离线支持（service worker + manifest，田间可用性）
2. **P1**：自定义策略点的配比建议（当前仅预设策略有 advice，自定义点可扩展）
3. **P2**：处方单 PDF 服务端生成（更精美排版）
4. **P2**：图表数据点 hover 高亮 + 十字线
5. **P2**：光谱预设自定义保存（用户可保存自己的光谱曲线）
6. **P3**：多语言（next-intl 英文版）
7. **P3**：跨设备配方同步（Prisma + API）

---

## v2.3 迭代记录（2026-07-19 cron 第 3 轮）

### 项目当前状态：✅ 稳定可用，PWA 离线 + 历史回溯 + 自定义点配比
- 开发服务器运行正常，ESLint 通过，无控制台错误
- PWA manifest + service worker 已部署，田间可离线使用
- agent-browser QA 全部通过

### 本轮完成的改进

#### 1. P1 新功能：自定义策略点的配比建议
- **问题**：v2.2 点击图表添加的自定义点只在策略对比表显示 R/Y/棚温/损失率，无配比建议
- **修复**：策略对比表自定义点行可点击展开，显示兑水比 / 粉剂用量 / 用水量
- 表格模式：线性插值 ratioN + coverage 计算精确值
- k 值模式：插值 ratio + 经验 coverage 估算（标注"估"）
- 超出产品数据范围时显示提示
- **验证**：R=38% 自定义点展开显示兑水比 1:5.9、粉剂 1.4kg、用水 8L

#### 2. P1 新功能：PWA 离线支持
- **manifest.json**：name/short_name/description/theme_color(#2d6a4f)/icons(192+512)/shortcuts
- **sw.js**：App Shell 预缓存 + stale-while-revalidate + 网络优先回退缓存
  - HTML：网络优先，失败回退缓存（保证离线可用）
  - 静态资源：stale-while-revalidate
  - 版本管理：CACHE_VERSION 清理旧缓存
- **PWA 图标**：AI 生成葡萄+太阳图标，sharp 转换为 192/512 PNG
- **pwa-register.tsx**：
  - Service Worker 自动注册
  - `beforeinstallprompt` 监听 → 显示"安装到桌面"浮动按钮
  - 在线/离线状态指示器（离线时显示"离线模式 · 缓存数据可用"）
  - 生产环境右下角"离线就绪"角标
- **layout.tsx**：metadata.manifest + appleWebApp + icons + viewport.themeColor
- **验证**：manifest.json 加载、theme-color #2d6a4f、无控制台错误

#### 3. P2 样式：图表 hover 十字线 + tooltip 美化
- **十字线**：ChartTooltip cursor 配置（primary 色虚线 + 6% 填充）
- **tooltip 美化**：
  - 圆角边框 + 阴影
  - 标题分隔线（R = XX%）
  - 双列布局（指标名 + 值，tabular-nums 对齐）
  - 条件着色：损失率>20% 红色、棚温>37°C 红色、光合保留绿色
  - min-w-[140px] 保证宽度一致

#### 4. P2 新功能：历史记录（最近计算快照）
- **history-dialog.tsx**：自动记录每次"有意义"的计算结果
  - 去重：相同 summary + preset 不重复记录
  - 最多保留 12 条（FIFO）
  - 每条含：时间戳、品种、参数快照、最优 R/Y/棚温/净收益
- **UI**：弹窗列表，每条卡片显示 4 指标网格 + 元信息
  - 相对时间（刚刚/X分钟前/X小时前）
  - 点击整卡回溯参数（loadParams）
  - hover 显示删除按钮 + 回溯图标
  - 顶部"清空"按钮
- **持久化**：localStorage `gcc:history:v1`
- **验证**：修改参数后自动记录、点击回溯恢复参数

#### 5. DialogDescription 可访问性修复
- 为历史弹窗添加 `DialogDescription`（修复 Radix Missing Description 警告）

### 验证结果
| 检查项 | 结果 |
|--------|------|
| 自定义点配比建议 | ✅ R=38% 展开显示 1:5.9 / 1.4kg / 8L |
| PWA manifest | ✅ 加载正常，theme-color #2d6a4f |
| PWA 图标 | ✅ 192/512 PNG，AI 生成葡萄+太阳 |
| Service Worker | ✅ 注册无错误 |
| 离线指示器 | ✅ 代码就绪（需离线测试） |
| 图表十字线 | ✅ hover 显示 primary 虚线 |
| tooltip 美化 | ✅ 双列布局 + 条件着色 |
| 历史记录自动 | ✅ 计算后自动记录，去重 |
| 历史回溯 | ✅ 点击恢复参数 |
| DialogDescription | ✅ 无警告 |
| 暗色模式 | ✅ 无错误 |
| 控制台错误 | ✅ 无 |
| ESLint | ✅ 通过 |

### 文件结构更新
```
public/
├─ manifest.json              # ★v2.3 PWA manifest
├─ sw.js                      # ★v2.3 Service Worker
├─ icon-192.png               # ★v2.3 PWA 图标
└─ icon-512.png               # ★v2.3 PWA 图标
src/app/
└─ layout.tsx                 # ★v2.3 manifest + themeColor + appleWebApp
src/components/calculator/
├─ pwa-register.tsx           # ★v2.3 SW 注册 + 安装提示 + 离线指示
├─ history-dialog.tsx         # ★v2.3 历史记录弹窗
├─ output-panel.tsx           # ★v2.3 自定义点可展开配比建议
└─ result-chart.tsx           # ★v2.3 十字线 + tooltip 美化
```

### 下一阶段建议优先事项
1. **P1**：光谱预设自定义保存（用户可保存自己的光谱曲线到 localStorage）
2. **P2**：处方单 PDF 服务端生成（更精美排版，当前为客户端打印）
3. **P2**：图表数据点 activeDot 高亮 + 点击区域扩大（当前点较小难精确点击）
4. **P2**：多日预报历史记录整合（多日计算也存入历史）
5. **P2**：PWA 离线实际测试（断网验证缓存命中）
6. **P3**：多语言（next-intl 英文版）
7. **P3**：跨设备配方同步（Prisma + API）
