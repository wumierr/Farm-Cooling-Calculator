# 🍇 葡萄大棚降温剂最佳配比计算器

基于光合效益与有害积热（HHA）模型的遮阳率优化工具，帮助葡萄种植户科学决策降温剂配比。

## ✨ 功能

- **实时计算**：参数变更自动重算最优遮阳率
- **综合效益模型**：Y = A_rel × (1 − L)，含光合效益 + HHA 产量损失
- **多策略对比**：安全省钱 / 最高效益 / 绝对保温度 + 自定义点
- **成本效益分析**：净收益曲线 + 盈亏平衡点标注
- **光谱编辑器**：可视化拖拽光谱曲线 + 6 种预设
- **多日预报**：输入 N 天天气，算累积 HHA 与最优喷洒日程
- **A/B 场景对比**：快照两套参数，曲线叠加 + 10 指标差异表
- **历史记录**：自动记录 + 搜索筛选 + CSV/JSON 导入导出
- **作业处方单**：一键打印（可另存 PDF）
- **暗色模式** + **PWA 离线** + **10 种品种预设** + **6 种天气场景**

## 🚀 本地使用

### 双击快捷方式（推荐）

| 双击文件 | 功能 |
|---------|------|
| `启动服务.vbs` | 启动服务 + 自动打开浏览器 |
| `停止服务.vbs` | 停止服务 |
| `打开网页.vbs` | 打开浏览器（服务未运行时自动启动） |
| `打包APK.vbs` | 一键打包 Android APK |
| `推送GitHub.vbs` | 一键推送到 GitHub（main 分支） |
| `部署公网.vbs` | 一键部署到 Cloudflare Pages |

### 首次使用，在项目文件夹中打开

```cmd
bun install
```

## 📱 APK 打包

双击 `打包APK.vbs`，产物在 `apk-build\android\app\build\outputs\apk\debug\app-debug.apk`。

## 🌐 公网部署（Cloudflare Pages）

### 自动部署（推荐）

1. 在 Cloudflare Pages 连接 GitHub 仓库 `wumierr/Farm-Cooling-Calculator`
2. 设置：
   - **Build command**: `bun run build:cloudflare`
   - **Output directory**: `out`
3. 之后每次双击 `推送GitHub.vbs` 推送代码到 main 分支，Cloudflare 自动部署。

### 手动部署

双击 `部署公网.vbs` — 本地构建 + 通过 Wrangler CLI 部署。

### 关于 CF 部署错误

如果你看到 `Missing entry-point` 错误，说明 Cloudflare 配置选错了模式：
- 需要在 Cloudflare Pages Dashboard 中连接 Git 仓库
- Pages 会按照 Build command 自动构建，**不需要**在 Dashboard 里手动设置 Wrangler/Workers

## 🏗️ 技术栈

- Next.js 16 + TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Zustand（状态管理 + localStorage 持久化）
- Recharts（图表）
- Capacitor（APK 打包）

## 📂 项目结构

```
src/
├─ app/                    # Next.js App Router
│  ├─ layout.tsx           # 根布局
│  ├─ page.tsx             # 首页
│  └─ globals.css          # 全局样式
├─ lib/calculator/         # 计算引擎（纯函数）
│  ├─ engine.ts            # 核心引擎（气温/HHA/光合/光谱/优化）
│  ├─ advice.ts            # 配比建议/策略/校验/净收益
│  ├─ multi-day.ts         # 多日预报引擎
│  ├─ presets.ts           # 常量 + 品种/天气/光谱预设
│  └─ types.ts             # 类型定义
└─ components/
   ├─ calculator/          # 业务组件
   └─ ui/                  # shadcn/ui 基础组件

public/                    # 静态资源（PWA 图标/manifest/SW）
```

## 📄 License

MIT
