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

## ⚡ 一键操作

### Windows（双击即可）

| 双击这个 | 干什么 |
|---|---|
| **`0-一键菜单.bat`** | **菜单式入口，所有功能都在里面（推荐从这里开始）** |
| `1-启动服务并打开网页.bat` | 装依赖 + 起开发服务 + 自动开浏览器（3000 端口） |
| `2-打开网页.bat` | 只开浏览器（服务没起会自动起） |
| `3-停止服务.bat` | 关服务、释放端口 |
| `4-推送GitHub.bat` | 一键提交 + 推送（冲突保留本地版本，默认推当前分支） |
| `5-打包APK.bat` | 打安卓安装包（首次自动装 Android SDK） |
| `6-部署Cloudflare.bat` | 一键发布到公网 |

首次启动会自动 `bun install`（约 1~3 分钟）。

### Linux / macOS

```bash
./scripts/serve.sh start                 # 启动（开发模式）
MODE=static ./scripts/serve.sh start     # 静态版预览，和线上表现一致
LAN=1 ./scripts/serve.sh start           # 局域网可访问，手机同 WiFi 能打开
./scripts/serve.sh stop

./scripts/install-desktop-entries.sh ~/Desktop   # 生成桌面快捷方式
```

> ⚠️ 根目录那几个 `.desktop` 文件的 Exec 路径写死成 `/home/z/my-project/...`（旧开发容器路径），
> 换台机器就失效。跑上面那条 `install-desktop-entries.sh` 会按当前实际路径重新生成。

## 📱 APK 打包

```powershell
# Windows：双击 5-打包APK.bat，或
powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -InstallSdk -Mirror
```

`-InstallSdk` 自动装 Android SDK，`-Mirror` 走阿里云镜像（国内必加）。
产物：根目录 `farm-cooling-calculator-debug-<日期>.apk`，安装后完全离线可用。

> ⚠️ **前置：JDK 21**。Capacitor 7 打 Android 包**强制 Java 21**（不是 17），否则报
> `invalid source release: 21`。装 [JDK 21](https://adoptium.net/temurin/releases/?version=21)
> 并把 `JAVA_HOME` 指向它。Android SDK 用 API 35（脚本 `-InstallSdk` 自动装），无需手动配。

装不了安卓环境也行：本项目是标准 PWA，部署到公网后可用
[PWABuilder](https://www.pwabuilder.com/) 在线一键转 APK。

## 🌐 公网部署

**最快路线**：双击 `6-部署Cloudflare.bat`，5 分钟拿到 `https://xxx.pages.dev`，免费 + 自动 HTTPS。

**有自己的服务器**：`sudo bash deploy/install-linux.sh` 一条命令搞定
（Caddy 自动 HTTPS / nginx+certbot / Docker / systemd 四选一）。

Cloudflare Pages 控制台手动配置时：

| 项 | 填什么 |
|---|---|
| Build command | `npx next build` |
| Output directory | `out` |
| 环境变量 | `DEPLOY_TARGET` = `cloudflare`，`NODE_VERSION` = `20` |

> 📖 **完整部署说明（服务器配置要求 + 9 条部署路线 + 常见问题）→ [docs/DEPLOY.md](docs/DEPLOY.md)**
>
> 💡 本项目所有计算都在浏览器完成，没有服务端逻辑 —— **可以当纯静态站点部署**，
> 128MB 内存的机器就能跑。只有将来要加后端接口时才需要 standalone 模式。

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
