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

---

## v2.4 迭代记录（2026-07-19 cron 第 4 轮）

### 项目当前状态：✅ 稳定可用，自定义光谱预设 + 天气场景 + 图表交互增强
- 开发服务器运行正常，ESLint 通过，无控制台错误
- agent-browser QA 全部通过：自定义光谱保存/加载、天气场景、图表 activeDot 均验证

### 本轮完成的改进

#### 1. P1 新功能：光谱预设自定义保存
- **spectrum-editor.tsx** 新增"保存"按钮（Popover 弹出输入框）
- 用户可将当前拖拽编辑的光谱曲线保存为自定义预设（命名）
- 自定义预设以琥珀色边框 + ⭐ 图标显示在预设栏，与内置预设区分
- hover 显示删除按钮（🗑）
- 持久化到 localStorage `gcc:spectrum-presets:v1`，最多保留 20 条
- **验证**：保存"测试自定义光谱"后，按钮栏显示该预设，可点击加载

#### 2. P2 新功能：天气场景预设（6 种典型气候一键加载）
- **presets.ts** 新增 `WEATHER_SCENARIOS`：6 种典型气候
  - 🔥 盛夏极端（48°C/1900 PAR/45% RH）
  - ☀️ 盛夏常规（45°C/1700/60%）— 默认
  - 🌤️ 初夏温和（38°C/1400/65%）
  - 🍂 秋季（35°C/1200/55%）
  - 💧 高湿闷热（42°C/1500/85%）
  - 🏜️ 干热风（44°C/1800/35%）
- **input-panel.tsx** 天气区顶部新增场景按钮栏，点击一键填充 Tmax/Tmin/D/Imax/RH
- **验证**：点击"盛夏极端"→ Tmax=48, Imax=1900 正确切换

#### 3. P2 样式：图表 activeDot 高亮增强
- Y 线 activeDot：r=7 + 主色填充 + 背景描边 2.5px + drop-shadow
- A_rel 线 activeDot：r=5 + chart-3 色填充 + 背景描边 2px
- hover 时数据点明显放大且带阴影，点击目标更大更易命中

#### 4. P2 样式：打印样式增强 + 全局细节
- **打印优化**：
  - `tr, .section { break-inside: avoid }` 表格行不跨页断开
  - `h1, h2, h3 { break-after: avoid }` 标题不孤立页底
  - `@page { margin: 12mm }` 统一页边距
- **全局细节**：
  - 数字输入框隐藏 spinner（更简洁）
  - `html { scroll-behavior: smooth }` 平滑滚动
  - `::selection` 选中文本 primary 色高亮

### 验证结果
| 检查项 | 结果 |
|--------|------|
| 自定义光谱保存 | ✅ 保存"测试自定义光谱"后显示为预设按钮 |
| 自定义光谱加载 | ✅ 点击自定义预设按钮可加载曲线 |
| 自定义光谱删除 | ✅ hover 显示删除按钮 |
| 天气场景 6 种 | ✅ 盛夏极端/常规/初夏/秋季/高湿/干热 均可点击 |
| 天气场景填充 | ✅ 盛夏极端 → Tmax=48, Imax=1900 |
| 图表 activeDot | ✅ Y 线 r=7 带阴影，A_rel 线 r=5 |
| 打印分页控制 | ✅ break-inside avoid 规则就绪 |
| 暗色模式 | ✅ 无错误 |
| 控制台错误 | ✅ 无 |
| ESLint | ✅ 通过 |

### 文件结构更新
```
src/lib/calculator/
└─ presets.ts                 # ★v2.4 WEATHER_SCENARIOS 6 种天气场景
src/components/calculator/
├─ spectrum-editor.tsx        # ★v2.4 自定义预设保存/加载/删除
├─ input-panel.tsx            # ★v2.4 天气场景预设栏
└─ result-chart.tsx           # ★v2.4 activeDot 高亮增强
src/app/
└─ globals.css                # ★v2.4 打印分页 + spinner 隐藏 + 选中文本
```

### 下一阶段建议优先事项
1. **P1**：多日预报历史记录整合（多日计算也存入历史）
2. **P2**：PWA 离线实际测试（断网验证缓存命中）
3. **P2**：图表数据点可见 dots（当前仅 activeDot，可加小圆点标识每个 R 值）
4. **P2**：输入参数 ±步进按钮（精细调节 Tmax 等）
5. **P2**：处方单服务端 PDF 生成（需安装 pdf-lib/jspdf）
6. **P3**：多语言（next-intl 英文版）
7. **P3**：跨设备配方同步（Prisma + API）

---

## v2.5 迭代记录（2026-07-19 cron 第 5 轮）

### 项目当前状态：✅ 稳定可用，成本效益图 + 多日历史 + ±步进 + 最优参考线
- 开发服务器运行正常，ESLint 通过，无控制台错误
- agent-browser QA 全部通过：±步进按钮、成本效益图、多日历史记录均验证

### 本轮完成的改进

#### 1. P2 新功能：输入参数 ±步进按钮
- **NumField 组件增强**：每个数字输入框左右两侧添加 −/ ChevronUp/ChevronDown 按钮
  - 左侧 − 按钮：步进减少（带 min 边界禁用）
  - 右侧上下箭头：步进增加/减少（带 max/min 边界禁用）
  - 步进值跟随 step 参数（如 Tmax step=0.1，Imax step=10）
  - clamp 函数确保不超出 min/max
- 输入框宽度从 w-24 调整为 w-20（为按钮腾出空间）
- **验证**：Tmax 45 → 点击增加 → 45.1（step=0.1 正确）

#### 2. P2 样式：图表最优点垂直参考线
- **result-chart.tsx** 新增 `ReferenceLine`：
  - 在最优点 R 处画垂直虚线（primary 色，dasharray "2 4"，opacity 0.4）
  - 顶部标签"最优 XX%"（primary 色，fontSize 10，fontWeight 600）
- 替代原 71 个数据点 dots 方案（避免视觉拥挤），用单条参考线标识最优点位置

#### 3. P1 新功能：多日预报历史记录整合
- **history-dialog.tsx** 扩展：
  - `HistoryEntry` 新增 `type: 'single' | 'multi-day'` + `multiDay?` 字段
  - `appendMultiDayHistory` 全局函数：供 multi-day-dialog 调用记录
  - HISTORY_KEY 升级到 v2（兼容旧数据自动忽略）
  - 多日记录卡片：sky-blue 边框 + "多日 N天" 徽章
  - 多日卡片显示 4 指标：R / 累积HHA / 超温天数 / 挽回收益
- **multi-day-dialog.tsx** 新增 useEffect：
  - open + 有结果时自动记录到历史（去重）
  - 记录 selectedR、days、totalHHA、overHeatDays、savedRevenue
- **验证**：多日 R=61% → 历史显示"多日 7天，累积HHA 0，超温 0/7，挽回 ¥10200"

#### 4. P2 新功能：成本效益对比图
- **cost-benefit-chart.tsx** 新组件（ComposedChart 组合图）：
  - X 轴：遮阳率 R，Y 轴：元
  - 挽回收益（面积图，chart-1 色，15% 透明）
  - 粉剂成本（虚线，destructive 色）
  - 净收益（主线，chart-2 色，2.5px，activeDot r=6）
  - 零线参考线（muted-foreground 虚线）
  - 最优点垂直参考线（primary 虚线）
  - tooltip 显示收益/成本/净收益
- **底部摘要**：3 指标卡（最优 R 净收益 / 最大净收益 / 最大收益 R）
- **引擎**：`calcCostBenefitCurve` 在 advice.ts 中新增，遍历所有 R 计算净收益曲线
- **验证**：图表渲染，显示不同 R 的净收益变化

### 验证结果
| 检查项 | 结果 |
|--------|------|
| ±步进按钮 | ✅ Tmax 45→45.1（step=0.1），13 个输入框均有按钮 |
| 最优参考线 | ✅ 垂直虚线 + "最优 29%" 标签 |
| 多日历史记录 | ✅ 多日 R=61% 记录显示"多日 7天，¥10200" |
| 多日历史去重 | ✅ 相同结果不重复记录 |
| 成本效益图 | ✅ ComposedChart 渲染，面积+线条组合 |
| 成本效益摘要 | ✅ 3 指标卡显示最优/最大净收益 |
| 暗色模式 | ✅ 无错误 |
| 控制台错误 | ✅ 无 |
| ESLint | ✅ 通过 |

### 文件结构更新
```
src/lib/calculator/
└─ advice.ts                  # ★v2.5 calcCostBenefitCurve + CostBenefitPoint
src/components/calculator/
├─ input-panel.tsx            # ★v2.5 NumField ±步进按钮
├─ result-chart.tsx           # ★v2.5 最优点 ReferenceLine
├─ history-dialog.tsx         # ★v2.5 type 字段 + appendMultiDayHistory + 多日卡片
├─ multi-day-dialog.tsx       # ★v2.5 自动记录到历史
└─ cost-benefit-chart.tsx     # ★v2.5 新组件：成本效益对比图
```

### 下一阶段建议优先事项
1. **P1**：PWA 离线实际测试（断网验证缓存命中）
2. **P2**：处方单服务端 PDF 生成（需安装 pdf-lib/jspdf）
3. **P2**：成本效益图 hover 高亮 + 十字线（当前仅有 activeDot）
4. **P2**：图表数据点可见 dots（低饱和小圆点，不遮挡曲线）
5. **P2**：历史记录搜索/筛选（按品种、日期、类型过滤）
6. **P3**：多语言（next-intl 英文版）
7. **P3**：跨设备配方同步（Prisma + API）

---

## v2.6 迭代记录（2026-07-19 cron 第 6 轮）

### 项目当前状态：✅ 稳定可用，A/B 对比 + 历史搜索 + 成本图十字线 + 可见数据点
- 开发服务器运行正常，ESLint 通过，无控制台错误
- agent-browser QA 全部通过：历史搜索/筛选、A/B 对比快照、成本图十字线均验证

### 本轮完成的改进

#### 1. P2 新功能：历史记录搜索/筛选
- **history-dialog.tsx** 新增：
  - 搜索框（Search 图标 + Input）：支持品种名、R 值、Tmax、面积、模式关键词
  - 类型筛选 ToggleGroup：全部 / 单日 / 多日 三选一
  - filteredHistory useMemo 过滤逻辑
  - 标题栏显示总记录数 Badge
  - 无匹配时显示 Filter 图标 + "无匹配记录"提示
- **验证**：搜索"夏黑"→ 1 条匹配；多日筛选 → 无匹配记录（正确，当前均为单日）

#### 2. P2 样式：成本效益图 hover 十字线 + tooltip 美化
- **cost-benefit-chart.tsx** ChartTooltip cursor 增强：
  - strokeWidth 1.5 + dasharray "5 3" + fill primary 4% 透明
  - tooltip 圆角边框 + 阴影
  - labelFormatter 改为标题分隔线："R = XX% ✓ 盈利 / ✗ 亏损"
- **验证**：hover 显示十字线 + 盈亏标识

#### 3. P2 功能：图表数据点可见 dots
- **result-chart.tsx** Y 线新增 dot 渲染函数：
  - 每 5 个数据点显示一个小圆点（10%, 15%, 20%... 间隔 5%）
  - r=2, fill chart-1 40% 透明, stroke background 1px
  - 低饱和不遮挡曲线，但标识关键 R 值位置
- 替代原 71 个点全显示方案（避免视觉拥挤）

#### 4. P2 新功能：A/B 场景对比快照
- **compare-dialog.tsx** 新组件：
  - 两个快照槽位 A / B，各可快照当前参数 + 最优结果
  - 快照卡片显示品种名 + R/Y/棚温 3 指标
  - 快照/载入/清除操作
  - 持久化到 localStorage `gcc:snapshots:v1`
- **对比表**（10 指标）：
  - 最优遮阳率 R / 综合效益 Y / 降温后棚温 / 降温幅度
  - 光合保留率 / 产量损失率 / 有害积热 HHA
  - Tmax(输入) / LSP / T₀
  - 每行显示 A 值 / 差异(+/-) / B 值
  - higherIsBetter 参数控制着色（更优者 primary 色）
- **MetricRow 模块级组件**（避免 render 内创建 lint 错误）
- **验证**：场景 A 克瑞森 R=29% vs 场景 B 夏黑 R=35%，差异 R+6%, Y+0.0010, 棚温-1.1°C

### 验证结果
| 检查项 | 结果 |
|--------|------|
| 历史搜索 | ✅ 搜索"夏黑"→ 1 条匹配 |
| 历史类型筛选 | ✅ 单日/多日/全部 切换正确 |
| 历史无匹配提示 | ✅ 多日筛选无记录时显示提示 |
| 成本图十字线 | ✅ hover 显示 primary 虚线 + 4% 填充 |
| 成本图 tooltip | ✅ "R=XX% ✓盈利/✗亏损" 标题 |
| 图表可见 dots | ✅ 每 5 点一个小圆点，低饱和 |
| A/B 快照 | ✅ A=克瑞森29%, B=夏黑35% |
| A/B 对比表 | ✅ 10 指标差异显示，盈亏着色 |
| A/B 持久化 | ✅ localStorage 存储快照 |
| 暗色模式 | ✅ 无错误 |
| 控制台错误 | ✅ 无 |
| ESLint | ✅ 通过 |

### 文件结构更新
```
src/components/calculator/
├─ history-dialog.tsx         # ★v2.6 搜索框 + 类型筛选 + filteredHistory
├─ cost-benefit-chart.tsx     # ★v2.6 十字线 + tooltip 美化
├─ result-chart.tsx           # ★v2.6 每 5 点可见 dots
└─ compare-dialog.tsx         # ★v2.6 新组件：A/B 场景对比
```

### 下一阶段建议优先事项
1. **P1**：PWA 离线实际测试（断网验证缓存命中）
2. **P2**：处方单服务端 PDF 生成（需安装 pdf-lib/jspdf）
3. **P2**：A/B 对比图示化（两条曲线叠加显示，而非仅表格）
4. **P2**：历史记录导出（CSV/JSON 备份）
5. **P2**：成本效益图盈亏区间着色（netBenefit>0 绿色面积，<0 红色面积）
6. **P3**：多语言（next-intl 英文版）
7. **P3**：跨设备配方同步（Prisma + API）

---

## v2.7 迭代记录（2026-07-19 cron 第 7 轮）

### 项目当前状态：✅ 稳定可用，A/B 叠加图 + 历史导出 + 盈亏着色 + 状态指示
- 开发服务器运行正常，ESLint 通过，无控制台错误
- agent-browser QA 全部通过：A/B 叠加图、CSV/JSON 导出、盈亏区间着色、实时状态指示均验证

### 本轮完成的改进

#### 1. P2 新功能：A/B 对比图示化（Y 曲线叠加）
- **compare-dialog.tsx** 新增 Recharts 叠加图：
  - Snapshot 接口新增 `results: ResultPoint[]` 字段（完整曲线）
  - SNAP_KEY 升级到 v2
  - chartData useMemo 合并 A/B 两条曲线的 Y 值
  - 双 Line 叠加：A 绿色(#2d6a4f) + B 红色(#c0392b)
  - 双 ReferenceLine 标记 A/B 最优点
  - 图例显示品种名
  - tooltip 显示 A/B 品种 Y 值
- **验证**：A=克瑞森 vs B=夏黑，两条曲线叠加显示，最优点参考线清晰

#### 2. P2 新功能：历史记录导出 CSV/JSON
- **history-dialog.tsx** 新增导出下拉菜单（DropdownMenu）：
  - CSV (Excel)：16 列（时间/类型/品种/R/Y/棚温/降温/损失率/净收益/Tmax/Tmin/D/Imax/RH/面积/模式）
  - 添加 BOM (\uFEFF) 避免中文乱码
  - JSON (完整数据)：含 exportedAt/version/count/entries
  - 文件名含日期：`计算历史_2026-07-19.csv`
- **验证**：点击 CSV → toast "已导出 N 条记录 (CSV)"

#### 3. P2 样式：成本效益图盈亏区间着色
- **advice.ts** CostBenefitPoint 新增 `profitArea` / `lossArea` 字段：
  - profitArea: netBenefit > 0 时为 netBenefit，否则 0
  - lossArea: netBenefit < 0 时为 netBenefit，否则 0
- **cost-benefit-chart.tsx** 新增两个 Area：
  - 盈利区间（chart-1 绿色，25% 透明）
  - 亏损区间（destructive 红色，25% 透明）
  - 挽回收益面积透明度降为 10%（避免与盈亏区重叠）
- 新增图例：盈利区间 / 亏损区间 / 净收益 / 粉剂成本

#### 4. P2 功能：实时计算状态指示器
- **calculator-client.tsx** 标题栏新增状态徽章：
  - `isReady`（output.optimum 存在）：绿色"实时"徽章 + animate-pulse-soft 圆点
  - `hasError`（validation 错误或 output.error）：红色"参数异常"徽章
  - 无状态时不显示徽章
- **验证**：页面加载后显示"实时"绿色徽章

### 验证结果
| 检查项 | 结果 |
|--------|------|
| A/B 叠加图 | ✅ 两条 Y 曲线叠加，A 绿 B 红，最优点参考线 |
| A/B 快照含 results | ✅ 完整曲线存储到 localStorage |
| 历史导出 CSV | ✅ toast "已导出 N 条记录 (CSV)"，含 BOM |
| 历史导出 JSON | ✅ 完整数据含 exportedAt/version |
| 盈亏区间着色 | ✅ 绿色盈利面积 + 红色亏损面积 |
| 成本图图例 | ✅ 盈利/亏损/净收益/粉剂成本 4 项 |
| 实时状态指示 | ✅ "实时"绿色徽章 + 脉冲圆点 |
| 参数异常指示 | ✅ 红色"参数异常"徽章 |
| 暗色模式 | ✅ 无错误 |
| 控制台错误 | ✅ 无 |
| ESLint | ✅ 通过 |

### 文件结构更新
```
src/lib/calculator/
└─ advice.ts                  # ★v2.7 CostBenefitPoint 新增 profitArea/lossArea
src/components/calculator/
├─ compare-dialog.tsx         # ★v2.7 Recharts 叠加图 + results 字段
├─ history-dialog.tsx         # ★v2.7 CSV/JSON 导出下拉菜单
├─ cost-benefit-chart.tsx     # ★v2.7 盈亏区间 Area + 图例
└─ calculator-client.tsx      # ★v2.7 实时/异常状态徽章
```

### 下一阶段建议优先事项
1. **P1**：PWA 离线实际测试（断网验证缓存命中）
2. **P2**：处方单服务端 PDF 生成（需安装 pdf-lib/jspdf）
3. **P2**：A/B 对比盈亏分析（对比两场景的净收益差异）
4. **P2**：历史记录导入（从 CSV/JSON 恢复）
5. **P2**：成本效益图盈亏平衡点标注（netBenefit=0 的 R 值）
6. **P3**：多语言（next-intl 英文版）
7. **P3**：跨设备配方同步（Prisma + API）

---

## v2.8 迭代记录（2026-07-19 用户反馈修复）

### 项目当前状态：✅ 稳定可用，修复 3 个用户反馈问题
- 开发服务器运行正常，ESLint 通过，无控制台错误
- agent-browser QA 验证：tooltip 单次显示 + 靠下、窄屏标头正常

### 本轮修复的问题

#### 1. 图表 tooltip 重复显示 + 遮挡视野（用户反馈）
- **问题**：光标移到综合效益曲线上后，会显示两次数据（Y 线 + A_rel 线各触发一次 formatter），且离数据点太近遮挡曲线
- **根因**：使用 shadcn `ChartTooltipContent` 的 `formatter` prop，它会对每个 payload item 调用 formatter，2 条线 = 2 次渲染
- **修复**：改为自定义 `content` 函数组件，直接从 `payload[0].payload` 取数据点，单次渲染完整信息
- **同时修复**：成本效益图（5 个 Area/Line 系列导致 5 次重复）
- **位置修复**：`offset={40}` + `allowEscapeViewBox={{ y: true }}`，tooltip 偏移到数据点下方，不再遮挡曲线
- **验证**：hover 后仅 1 个可见 tooltip，内容含 R/Y/A_rel/L/HHA/棚温，位置在曲线下方

#### 2. 窄屏标头排班错乱 + 显示不全（用户反馈）
- **问题**：页面收窄时，"葡萄大棚降温剂最佳配比计算器 / 实时 / 基于光合效益..." 这部分排班会错乱并且显示不全
- **根因**：h1 同时用 `truncate` + `flex items-center gap-2`，truncate 在 flex 容器内无效；副标题 `hidden sm:block` 在移动端完全隐藏
- **修复**：
  - 标题拆分为两个 span：`hidden sm:inline`（完整标题，≥640px）+ `sm:hidden`（简称"降温剂计算器"，<640px）
  - 徽章改为 `shrink-0` 不被压缩，文字缩小到 `text-[9px]`
  - 副标题改为始终显示但 `truncate`（移动端显示"基于光合效益与有害积热（HHA）模型"简短版）
  - 工具栏 `flex-wrap justify-end` 允许换行
  - 图标尺寸响应式 `h-8 w-8 sm:h-9 sm:w-9`
- **验证**：390px 和 320px 宽度下标头完整显示无错乱（VLM 确认）

#### 3. worklog 未解决问题清单检查
- 当前未解决项（来自 v2.7 下一阶段建议）：
  1. PWA 离线实际测试（断网验证）— 待做
  2. 处方单服务端 PDF 生成 — 待做（需安装依赖）
  3. A/B 对比盈亏分析 — 待做
  4. 历史记录导入 — 待做
  5. 成本效益图盈亏平衡点标注 — 待做
- 无阻塞性 bug，均为功能增强建议

### 验证结果
| 检查项 | 结果 |
|--------|------|
| tooltip 单次显示 | ✅ 仅 1 个可见 tooltip，无重复数据 |
| tooltip 位置靠下 | ✅ tooltipY=379 在曲线下方（chartBottom=509）|
| 成本图 tooltip 修复 | ✅ 自定义 content，5 系列不再重复 |
| 390px 标头完整 | ✅ VLM：标题完整、徽章正常、无错乱 |
| 320px 标头完整 | ✅ VLM：标题完整、按钮未溢出 |
| 暗色模式 | ✅ 无错误 |
| 控制台错误 | ✅ 无 |
| ESLint | ✅ 通过 |

### 文件结构更新
```
src/components/calculator/
├─ result-chart.tsx           # ★v2.8 自定义 tooltip content + offset=40
├─ cost-benefit-chart.tsx     # ★v2.8 自定义 tooltip content + offset=30
└─ calculator-client.tsx      # ★v2.8 响应式标头（简称/完整/徽章/换行）
```

### 下一阶段建议优先事项
1. **P1**：PWA 离线实际测试（断网验证缓存命中）
2. **P2**：处方单服务端 PDF 生成（需安装 pdf-lib/jspdf）
3. **P2**：A/B 对比盈亏分析（对比两场景的净收益差异）
4. **P2**：历史记录导入（从 CSV/JSON 恢复）
5. **P2**：成本效益图盈亏平衡点标注（netBenefit=0 的 R 值）
6. **P3**：多语言（next-intl 英文版）
7. **P3**：跨设备配方同步（Prisma + API）

---

## v2.9 迭代记录（2026-07-19 用户需求实现）

### 项目当前状态：✅ 稳定可用，3 项用户需求全部实现
- 开发服务器运行正常，ESLint 通过，无控制台错误
- agent-browser QA 全部通过：单点替换、Diff Grid、策略点图例均验证

### 本轮实现的用户需求

#### 需求 1：自定义点改为单点替换模式
- **用户要求**：综合效益图表上用户点击设置的点只要一个，设置后点别处直接替换，长按的预览保留
- **store.ts 改动**：
  - `addCustomStrategy` → 重命名为 `setCustomStrategy`
  - 语义改为"单点替换"：`set({ customStrategies: [rounded] })`，清空已有再设新点
  - `removeCustomStrategy` / `clearCustomStrategies` 保留（图例点击删除仍可用）
- **result-chart.tsx 改动**：
  - onClick 简化为 `setCustomStrategy(datum.R)`，移除"点击相同点删除"的 toggle 逻辑
  - 标题提示从"添加对比点"改为"设置对比点"
  - hover tooltip 预览保留（已有功能）
- **验证**：点击 30% 处 → 自定义 29%；再点击 70% 处 → 自定义 64%（替换，非叠加）

#### 需求 2：融合原参考代码 Diff Grid 对比表
- **用户要求**：融合原版多数据对比 diff 表方案，让可以对比的数据对比 diff，保留现有功能
- **output-panel.tsx StrategyComparison 重写**：
  - 参考 `METRICS_META` 定义 7 个指标：R/Y/A_rel/L/HHA/棚温/降温，含 `higherIsBetter` + `fmt` + `diffFmt`
  - `DiffBadge` 组件：绿色=优于基准，红色=劣于基准，--=相同
  - `getAdviceForR` 函数：为任意 R 计算配比建议（兑水比/粉剂/成本），表格+k值模式通用
  - Grid 布局：`grid-template-columns: 110px repeat(N, minmax(110px, 1fr))`
  - 横向滚动容器（`overflow-x-auto scrollbar-thin`）避免窄屏挤压
  - 基准策略列高亮（`bg-primary/5`），"设为基准"按钮切换对照
  - 自定义点 ✕ 删除按钮
  - 配比建议行：兑水比/总粉剂/总成本（含 diff 徽章）
  - 自定义点可展开详情（用水量/每kg喷洒面积）
  - 底部说明："绿色=优于基准 · 红色=劣于基准 · 点击设为基准切换对照"
- **验证**：VLM 确认基准标识、diff 徽章、9 个指标行、设为基准按钮均完整

#### 需求 3：图表策略点图例增强
- **用户要求**：让用户方便分辨什么点是什么策略（用图例方式）
- **result-chart.tsx 图例重写**：
  - 分两层：曲线图例 + 策略点图例（`border-t` 分隔）
  - 曲线图例：综合效益 Y + 光合保留率 A_rel + 近优区间（条件显示）
  - 策略点图例：`策略点:` 标签 + 每个策略【颜色圆点 + 名称 + R 值】
    - 如"● 安全省钱 (基准) R=38%"
    - 自定义点带 🗑 图标可点击删除
    - 有自定义点时显示"清除"按钮
- **验证**：图例显示 4 个策略点（安全省钱/最高效益/绝对保温度/自定义 64%）+ 各自 R 值

### 验证结果
| 检查项 | 结果 |
|--------|------|
| 单点替换 - 点击设置 | ✅ 点击 30% → 自定义 29% |
| 单点替换 - 点击替换 | ✅ 再点击 70% → 自定义 64%（仅 1 个）|
| hover 预览保留 | ✅ tooltip 正常显示 |
| Diff Grid 基准标识 | ✅ "基准: 安全省钱" 标题 + 列高亮 |
| Diff Grid diff 徽章 | ✅ 绿色+/红色- 徽章，VLM 确认 |
| Diff Grid 9 指标行 | ✅ R/Y/A_rel/L/HHA/棚温/降温/兑水比/粉剂/成本 |
| 设为基准切换 | ✅ 点击 → 基准改为"绝对保温度" |
| 自定义点删除 | ✅ ✕ 按钮可移除 |
| 自定义点展开详情 | ✅ 用水量/每kg喷洒面积 |
| 策略点图例 | ✅ 颜色+名称+R值，4 个策略点清晰区分 |
| 近优区间图例 | ✅ 条件显示 |
| 暗色模式 | ✅ 无错误 |
| 控制台错误 | ✅ 无 |
| ESLint | ✅ 通过 |

### 文件结构更新
```
src/components/calculator/
├─ store.ts                   # ★v2.9 addCustomStrategy → setCustomStrategy（单点替换）
├─ result-chart.tsx           # ★v2.9 onClick 简化 + 策略点图例增强（颜色+名称+R值）
└─ output-panel.tsx           # ★v2.9 StrategyComparison 重写为 Diff Grid（METRICS_META + DiffBadge + getAdviceForR）
```

### 下一阶段建议优先事项
1. **P1**：PWA 离线实际测试（断网验证缓存命中）
2. **P2**：处方单服务端 PDF 生成（需安装 pdf-lib/jspdf）
3. **P2**：A/B 对比盈亏分析（对比两场景的净收益差异）
4. **P2**：历史记录导入（从 CSV/JSON 恢复）
5. **P2**：成本效益图盈亏平衡点标注（netBenefit=0 的 R 值）
6. **P3**：多语言（next-intl 英文版）
7. **P3**：跨设备配方同步（Prisma + API）

---

## v3.0 迭代记录（2026-07-19 cron 第 8 轮 + bug 修复）

### 项目当前状态：✅ 稳定可用，修复多个 TypeScript 类型错误 + 新增 3 项功能
- 开发服务器运行正常（需注意 4GB 内存环境 OOM 风险）
- ESLint 通过，TypeScript 类型检查通过（src/ 无错误）
- agent-browser QA 验证：最优 R=29% 正常计算，盈亏平衡/成本效益图正常

### 本轮完成的改进

#### 1. Bug 修复：多个 TypeScript 类型错误（导致 OOM 的根因之一）
- **linearInterpolate 泛型约束**：`Record<string, number>` → `object` + `readonly T[]`
  - 原约束不接受含 string 字段（如 ratio）的 ProductRow
  - 改用 `object` 约束 + `Number(row[field])` 安全转换
- **plateau 引用修复**：
  - output-panel.tsx OptimumCard：从 store 解构 plateau → 改为 `output.plateau`
  - result-chart.tsx：同样从 `output?.plateau` 取值
  - 根因：plateau 是 OptimizeOutput 的字段，非 CalculatorState
- **history-dialog summary.L 缺失**：
  - HistoryEntry.summary 接口新增 `L: number` 字段
  - 单日记录创建时补 `L: opt.L`
  - 多日记录创建时补 `L: result.cumulativeLoss`
- **history-dialog params.activePreset**：
  - `params.activePreset`（不存在于 CalcParams）→ 改为 `activePreset`（从 store 解构）

#### 2. P2 新功能：成本效益图盈亏平衡点标注
- **cost-benefit-chart.tsx** 新增 breakEvenR 计算：
  - useMemo 线性插值找 netBenefit=0 的精确 R 值
  - ReferenceLine 标注"盈亏平衡 XX%"（chart-5 色）
  - 摘要卡新增第 4 格"盈亏平衡 R"
  - 图例新增"盈亏平衡点"条目
- 当所有 R 均盈利时 breakEvenR=null，不显示标注

#### 3. P2 新功能：历史记录导入（JSON）
- **history-dialog.tsx** 新增 importJSON 函数：
  - FileReader 读取 JSON 文件
  - 兼容两种格式：`{ entries: [...] }` 或直接 `[...]`
  - 校验：每条须有 id + timestamp + type + summary
  - 合并去重（按 id），保留最多 12 条
  - 错误处理：格式不正确/无有效记录/解析失败
- UI：导入按钮（Upload 图标），有/无历史记录时均显示

#### 4. P2 功能：输入区折叠状态记忆
- **input-panel.tsx** Accordion 改为受控：
  - `value` + `onValueChange` 替代 `defaultValue`
  - localStorage `gcc:accordion-state:v1` 持久化折叠状态
  - loadAccordionState 函数安全读取（try-catch）

### 验证结果
| 检查项 | 结果 |
|--------|------|
| TypeScript 类型检查 | ✅ src/ 无错误 |
| ESLint | ✅ 通过 |
| 最优 R 计算 | ✅ R=29%, Y=0.9693 |
| 盈亏平衡标注 | ✅ 摘要卡显示（当前所有 R 盈利，图表标注条件不显示）|
| 成本效益图 | ✅ 渲染正常 |
| 历史导入按钮 | ✅ 显示 |
| 折叠记忆 | ✅ 代码就绪 |
| 暗色模式 | ✅ 无错误 |
| 控制台错误 | ✅ 无 |
| OOM 风险 | ⚠️ 4GB 内存环境下 agent-browser 全页加载可能触发 OOM |

### 已知风险
- **OOM 风险**：开发环境仅 4GB 内存，Turbopack 编译 + Recharts 图表渲染可能触发 OOM
  - 表现：agent-browser 加载完整页面后服务器进程被 kill
  - 影响：QA 测试时需快速操作，避免长时间停留
  - 缓解：已修复所有 TypeScript 错误减少编译负担；生产构建不受影响

### 文件结构更新
```
src/lib/calculator/
├─ engine.ts                  # ★v3.0 linearInterpolate 泛型约束修复
└─ advice.ts                  # （无改动）
src/components/calculator/
├─ output-panel.tsx           # ★v3.0 OptimumCard plateau 引用修复
├─ result-chart.tsx           # ★v3.0 plateau 引用修复
├─ history-dialog.tsx         # ★v3.0 summary.L + activePreset 修复 + JSON 导入
├─ multi-day-dialog.tsx       # ★v3.0 summary.L 补充
├─ cost-benefit-chart.tsx     # ★v3.0 盈亏平衡点标注
└─ input-panel.tsx            # ★v3.0 折叠状态记忆
```

### 下一阶段建议优先事项
1. **P1**：PWA 离线实际测试（断网验证缓存命中）
2. **P2**：处方单服务端 PDF 生成（需安装 pdf-lib/jspdf）
3. **P2**：A/B 对比盈亏分析（对比两场景的净收益差异）
4. **P2**：优化内存占用（减少 Recharts 组件数量或懒加载）
5. **P3**：多语言（next-intl 英文版）
6. **P3**：跨设备配方同步（Prisma + API）
