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

### 命令行（Windows）

```cmd
bun install              :: 安装依赖
serve.bat start          :: 启动服务
serve.bat open           :: 打开浏览器
serve.bat stop           :: 停止服务
serve.bat status         :: 查看状态
```

## 📱 APK 打包

```cmd
apk-build\build-apk.bat
```

产物：`apk-build\android\app\build\outputs\apk\debug\app-debug.apk`

APK 安装后离线可用，无需网络。

## 🌐 公网部署（Cloudflare Pages）

```cmd
deploy-cloudflare.bat
```

或手动配置 Cloudflare Pages（推荐自动部署）：
- **Build command**: `set DEPLOY_TARGET=cloudflare && bun run build`
- **Output directory**: `out`

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
