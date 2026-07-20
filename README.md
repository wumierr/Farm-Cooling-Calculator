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
| `推送GitHub.vbs` | 一键推送到 GitHub |
| `部署公网.vbs` | 一键部署到 Cloudflare Pages |

### 首次使用，在项目文件夹中打开

```cmd
bun install
```

## 📱 APK 打包

双击 `打包APK.vbs`，产物在 `apk-build\android\app\build\outputs\apk\debug\app-debug.apk`。

## 🌐 公网部署

**方式一**：双击 `部署公网.vbs`

**方式二**（推荐自动部署）：在 Cloudflare Pages 连接 GitHub 仓库，设置：
- **Build command**: `set DEPLOY_TARGET=cloudflare && bun run build`
- **Output directory**: `out`

之后每次双击 `推送GitHub.vbs` 推送代码，Cloudflare 自动部署。

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

apk-build/                 # APK 打包环境
public/                    # 静态资源（PWA 图标/manifest/SW）
```

## 📄 License

MIT
