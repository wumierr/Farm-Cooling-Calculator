# 🚀 部署总说明 — 葡萄大棚降温剂计算器

> **关键前提**：本项目虽然用了 Next.js，但**所有计算都在浏览器里完成**
> （`src/lib/calculator/` 是纯函数，状态存在 localStorage）。
> `src/app/api/route.ts` 只是个 hello-world 占位，`src/lib/db.ts` 没有任何地方引用。
>
> **所以它可以当纯静态站点部署** —— 不需要 Node 服务器、不需要数据库、不需要 Prisma。
> 这让部署难度直接降到和一个 HTML 文件差不多。

---

## 目录

- [0. 一分钟决策表](#0-一分钟决策表)
- [1. 本地使用](#1-本地使用)
- [2. 两种构建产物的区别](#2-两种构建产物的区别)
- [3. 公网部署 · 免运维路线（推荐）](#3-公网部署--免运维路线推荐)
- [4. 公网部署 · 自有服务器路线](#4-公网部署--自有服务器路线)
- [5. 服务器配置要求](#5-服务器配置要求)
- [6. 打包安卓 APK](#6-打包安卓-apk)
- [7. 常见问题](#7-常见问题)

---

## 0. 一分钟决策表

| 你的情况 | 选这个 | 要花钱吗 | 大概几分钟 | 命令 / 入口 |
|---|---|---|---|---|
| 自己在电脑上用 / 改代码 | 本地开发服务 | 否 | 首次 3 分钟 | 双击 `1-启动服务并打开网页.bat` |
| 想发给别人用，不想折腾 | **Cloudflare Pages** | 免费 | 5 分钟 | 双击 `6-部署Cloudflare.bat` |
| 已经在用 GitHub | GitHub Pages | 免费 | 5 分钟 | 推代码 + 仓库里点一下 |
| 有服务器 + 域名 | Caddy 静态版 | 服务器费用 | 10 分钟 | `sudo bash deploy/install-linux.sh caddy 你的域名` |
| 有服务器但不想装东西 | Docker 静态版 | 服务器费用 | 5 分钟 | `sudo bash deploy/install-linux.sh docker` |
| 将来要加后端接口 | standalone + systemd | 服务器费用 | 15 分钟 | `sudo bash deploy/install-linux.sh node` |
| 局域网共享给同事/家人 | 局域网模式 | 否 | 1 分钟 | 菜单选 `5` |
| 装到手机上离线用 | APK | 否 | 首次 25 分钟 | 双击 `5-打包APK.bat` |

**没主意就选 Cloudflare Pages。**

---

## 1. 本地使用

### 最简单：双击 bat

| 文件 | 作用 |
|---|---|
| `0-一键菜单.bat` | 菜单式入口，所有功能都在里面（**推荐**） |
| `1-启动服务并打开网页.bat` | 装依赖 → 启动开发服务 → 自动开浏览器 |
| `2-打开网页.bat` | 只开浏览器（服务没起会自动起） |
| `3-停止服务.bat` | 关掉服务，释放 3000 端口 |
| `4-推送GitHub.bat` | 一键提交并推送（本地优先） |
| `5-打包APK.bat` | 打包安卓安装包 |
| `6-部署Cloudflare.bat` | 部署到公网 |

首次启动会自动执行 `bun install`（约 1~3 分钟，700MB 依赖），之后就快了。

### 命令行（Windows）

```powershell
powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 start           # 开发模式
powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 start -Prod     # 生产模式（先 build）
powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 start -Static   # 静态版预览（和线上一致）
powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 start -Lan      # 局域网可访问
powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 status
powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 stop
```

### 命令行（Linux / macOS / WSL）

```bash
./scripts/serve.sh start
MODE=static ./scripts/serve.sh start    # 静态版预览
LAN=1 ./scripts/serve.sh start          # 局域网可访问
./scripts/serve.sh stop
```

Linux 桌面快捷方式（修正仓库里那几个 `/home/z/my-project` 死路径的 `.desktop`）：

```bash
./scripts/install-desktop-entries.sh ~/Desktop
```

### 局域网共享（手机同 WiFi 直接打开）

菜单选 `5`，脚本会打印类似 `http://192.168.1.23:3000` 的地址，手机浏览器输入即可。
首次可能被 Windows 防火墙拦，弹窗时勾选「专用网络」→ 允许访问。

---

## 2. 两种构建产物的区别

这是本项目部署时**唯一需要想清楚的事**：

| | 静态导出（`out/`） | Standalone（`.next/standalone/`） |
|---|---|---|
| 产物 | 一堆 HTML/CSS/JS 文件 | 一个 Node 程序 + 精简依赖 |
| 怎么跑 | 任何 web 服务器托管即可 | `node server.js` |
| 内存占用 | ~10 MB（nginx） | ~120 MB |
| 能放哪 | Pages / OSS / nginx / CDN / **APK** | VPS / Docker / PaaS |
| 支持 API 路由 | 只支持静态 GET | 完全支持 |
| 构建命令 | `scripts\build-static.ps1` | `scripts\build-standalone.ps1` |

**本项目当前没有服务端逻辑，选静态导出就对了。**
只有当你以后真要加"存到服务器的数据库""用户登录"这类功能时，才需要 standalone。

构建模式由 `next.config.ts` 里的环境变量决定：

| 环境变量 | 产物 | 用途 |
|---|---|---|
| `DEPLOY_TARGET=cloudflare` | `out/`，绝对路径 | 网站 |
| `CAPACITOR_BUILD=1` | `out/`，相对路径 + trailingSlash | APK（`file://` 加载） |
| `NEXT_PUBLIC_BASE_PATH=/仓库名` | 加子路径前缀 | GitHub Pages 子路径部署 |
| 都不设 + `NODE_ENV=production` | `.next/standalone/` | 自有服务器 |

---

## 3. 公网部署 · 免运维路线（推荐）

### 3.1 Cloudflare Pages ⭐ 首选

免费额度足够（每月 500 次构建、无限带宽），国内速度在同类里最好，自动 HTTPS + 全球 CDN。

#### 路线 A：命令行一键

```bash
# Windows：双击 6-部署Cloudflare.bat，或
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloudflare.ps1

# Linux / macOS
./scripts/deploy-cloudflare.sh
```

首次会弹浏览器授权，之后全自动。完成后：`https://farm-cooling-calculator.pages.dev`

#### 路线 B：控制台连 Git（不碰命令行）

1. 先推代码到 GitHub（双击 `4-推送GitHub.bat`）
2. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git
3. 构建设置：

| 项 | 填什么 |
|---|---|
| Framework preset | `Next.js (Static HTML Export)` 或 `None` |
| Build command | `npx next build` |
| Build output directory | `out` |
| 环境变量 | `DEPLOY_TARGET` = `cloudflare` |
| 环境变量 | `NODE_VERSION` = `20` |

4. Save and Deploy

之后每次 `git push` 自动重新部署。

> ⚠️ **必须加 `DEPLOY_TARGET=cloudflare` 环境变量**，否则 Next 不会走静态导出，
> 构建能过但没有 `out/` 目录，部署会失败。

#### 路线 C：GitHub Actions

`.github/workflows/deploy-cloudflare.yml` 已备好，在 GitHub 仓库
Settings → Secrets and variables → Actions 里加两个密钥：

| Secret | 从哪拿 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → 个人资料 → API 令牌 → 创建（权限：账户 → Cloudflare Pages → 编辑） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers & Pages 概览页右侧 |

#### 绑定自有域名

Pages 项目 → Custom domains → Set up a custom domain。证书自动签发续期。

---

### 3.2 GitHub Pages

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**
2. 推一次代码
3. 访问 `https://<用户名>.github.io/<仓库名>/`

配置文件已备好：`.github/workflows/deploy-pages.yml`。
它会传 `NEXT_PUBLIC_BASE_PATH=/<仓库名>`，让资源路径带上子路径前缀
（`next.config.ts` 已支持这个变量）。**绑定自定义域名后**站点在根路径，
把 workflow 里那一行删掉即可。

---

### 3.3 Netlify

```bash
cp deploy/netlify.toml ./netlify.toml
# 然后 app.netlify.com 连 Git，或：
npx netlify-cli deploy --dir=out --prod
```

### 3.4 Vercel

```bash
cp deploy/vercel.json ./vercel.json
npx vercel --prod
```

Vercel 原生支持 Next.js，不加配置也能部署（会走 SSR 模式）。
配成静态导出更省额度，也和其它平台行为一致。国内访问不稳，优先 Cloudflare。

### 3.5 其它静态托管

生成 `out/` 后整个目录传上去即可：阿里云 OSS、腾讯云 COS、七牛云、Gitee Pages、
宝塔面板的网站根目录、`npx surge out` ……

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-static.ps1
```
```bash
./scripts/build-static.sh
```

---

## 4. 公网部署 · 自有服务器路线

### 4.1 一条命令全自动（推荐）

```bash
sudo bash deploy/install-linux.sh
```

四种方案可选：

| 方案 | 产物 | 需要域名 | 自动 HTTPS | 内存占用 |
|---|---|---|---|---|
| `caddy` | 静态版 | ✅ | ✅ 自动申请+续期 | ~30 MB |
| `nginx` | 静态版 | ✅ | ✅ 通过 certbot | ~10 MB |
| `docker` | 静态版容器 | ❌ | ❌（需再套反代） | ~15 MB |
| `node` | standalone | ❌ | ❌ | ~120 MB |

非交互：

```bash
sudo bash deploy/install-linux.sh caddy  calc.example.com
sudo bash deploy/install-linux.sh nginx  calc.example.com
sudo bash deploy/install-linux.sh docker
sudo bash deploy/install-linux.sh node
```

支持 Debian / Ubuntu / CentOS / RHEL / Rocky / Alma。脚本会自动装 Node 20（构建需要）。

### 4.2 Docker

```bash
# 静态版（推荐，镜像约 50MB）
docker build -f deploy/Dockerfile.static -t farm-cooling-static .
docker run -d --name farm-cooling -p 8080:80 --restart unless-stopped farm-cooling-static

# standalone 版（镜像约 180MB）
docker build -f deploy/Dockerfile -t farm-cooling-node .
docker run -d --name farm-cooling -p 3000:3000 --restart unless-stopped farm-cooling-node
```

compose：

```bash
docker compose -f deploy/docker-compose.yml up -d --build web-static          # 静态版
docker compose -f deploy/docker-compose.yml --profile node up -d --build      # standalone
docker compose -f deploy/docker-compose.yml logs -f
docker compose -f deploy/docker-compose.yml down
```

自动 HTTPS：把 `docker-compose.yml` 里的 `caddy` 服务取消注释（文件里有步骤）。

### 4.3 nginx（手动）

```bash
./scripts/build-static.sh
sudo mkdir -p /var/www/farm-cooling
sudo cp -r out/. /var/www/farm-cooling/
sudo cp deploy/nginx.conf /etc/nginx/conf.d/farm-cooling.conf
sudo sed -i 's|/usr/share/nginx/html|/var/www/farm-cooling|' /etc/nginx/conf.d/farm-cooling.conf
sudo sed -i 's|server_name  _;|server_name  calc.example.com;|' /etc/nginx/conf.d/farm-cooling.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d calc.example.com
```

### 4.4 Caddy（手动，最省心）

```bash
./scripts/build-static.sh
sudo mkdir -p /var/www/farm-cooling && sudo cp -r out/. /var/www/farm-cooling/
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo sed -i 's/calc.example.com/你的域名/' /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### 4.5 systemd（standalone 版）

```bash
./scripts/build-standalone.sh
sudo useradd -r -s /usr/sbin/nologin webapp
sudo mkdir -p /opt/farm-cooling
sudo cp -r .next/standalone/. /opt/farm-cooling/
sudo chown -R webapp:webapp /opt/farm-cooling
sudo cp deploy/farm-cooling.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now farm-cooling
```

单元文件已做安全加固（只读文件系统、内存上限 512M、禁止提权）。

---

## 5. 服务器配置要求

### 5.1 运行时配置（部署静态版）

| 项 | 最低 | 建议 | 说明 |
|---|---|---|---|
| CPU | 1 核 | 1 核 | 静态文件几乎不吃 CPU |
| 内存 | **128 MB** | 512 MB | nginx ~10MB / Caddy ~30MB |
| 磁盘 | 300 MB | 1 GB | 站点本体约 5MB |
| 带宽 | 1 Mbps | 3 Mbps | 首屏约 500KB，gzip 后约 150KB |
| 系统 | 任意 Linux | Debian 12 / Ubuntu 22.04 | |

### 5.2 运行时配置（部署 standalone 版）

| 项 | 最低 | 建议 |
|---|---|---|
| CPU | 1 核 | 2 核 |
| 内存 | **512 MB** | 1 GB |
| 磁盘 | 1 GB | 2 GB |
| Node.js | 18 | 20 LTS |

### 5.3 构建机配置（要在服务器上现场构建时）

`next build` 比运行本身吃资源得多：

| 项 | 最低 | 建议 |
|---|---|---|
| 内存 | **2 GB**（1GB 机器大概率 OOM） | 4 GB |
| 磁盘 | 2 GB（node_modules 约 700MB） | 5 GB |
| Node.js | 18 | 20 LTS |

> 💡 **1GB 内存的小机器怎么办**：别在服务器上构建。
> 在本地跑 `scripts\build-static.ps1`，把 `out/` 上传上去就行 ——
> 静态文件不需要构建环境。或者干脆用 Cloudflare Pages，构建在人家那边跑。

### 5.4 端口与防火墙

| 端口 | 用途 | 何时需要 |
|---|---|---|
| 80 | HTTP + 证书签发验证 | 用域名时**必开** |
| 443 | HTTPS | 用域名时**必开** |
| 8080 | 静态版容器直连 | docker 方案 |
| 3000 | standalone 直连 | node 方案（建议只对内网开，前面加反代） |

云服务器要在**两个地方**放行：厂商控制台的安全组 + 系统防火墙。
`install-linux.sh` 只能处理系统防火墙那一半，安全组得自己去控制台点。

### 5.5 域名与备案

- 没有域名也能用（IP + 端口），但没有 HTTPS
- 加一条 **A 记录**指向服务器公网 IP
- **中国大陆服务器**：域名必须 ICP 备案，否则 80/443 被拦
  → 不想备案就用**境外服务器**或 **Cloudflare Pages**

### 5.6 本机开发环境要求

| 工具 | 版本 | 必需性 | 本机现状 |
|---|---|---|---|
| Node.js | 18+（本项目静态导出用；Capacitor 7 CLI 也够用） | 一切的基础 | ✅ v20.17.0（`D:\nodejs`） |
| bun | 1.x | 装依赖快 4 倍（可选，没有会用 npm） | ✅ 1.3.14 |
| Git | 2.x | 推 GitHub | ✅ v2.54.0 |
| **JDK** | **21**（Capacitor 7/8 强制，**不是 17**） | 打 APK | ⚠️ 本机 17.0.3.1 **需升级到 21** |
| Android SDK | **API 35 + build-tools 35.0.0**（Capacitor 7） | 打 APK | ❌ 未装，`build-apk.ps1 -InstallSdk` 自动装 |
| PowerShell | 5.1+ | 跑 .ps1 | ✅ 系统自带 |

> ⚠️ **APK 打包的头号坑 = JDK 版本**：`@capacitor/*` 从 7 起，Android 构建**强制 Java 21**。
> 本机装的是 JDK 17，`gradlew assembleDebug` 会报 `invalid source release: 21`。
> 解决：装 [JDK 21](https://adoptium.net/temurin/releases/?version=21)（或用新版 Android Studio 自带的 21），
> 把 `JAVA_HOME` 指向它即可。SDK 层面 Capacitor 7 用 API 35，脚本装的正是 35，无需改动。
> （若将来升级到 Capacitor 8：额外需要 **Node 22 + SDK/build-tools 36**。）

**磁盘空间**：`node_modules` 约 700MB，`.next` 约 300MB，Android SDK 约 600MB，
Gradle 缓存约 1GB。留 4GB 比较稳妥。

> ⚠️ **网络提醒**：本机 `HTTP_PROXY` 指向一个并非常驻的本地端口，
> 挂着它会让 git / npm / wrangler 直接失败。所有脚本已在会话内自动清除代理变量。
> 但**对 GitHub 的访问本身受限**，`git push` 失败属预期情况，需要时先确认代理软件已启动。
>
> 另外 `next build` 会去 Google Fonts 下载 Geist 字体（`src/app/layout.tsx` 用了
> `next/font/google`）。**完全断网时构建会失败**，这是本项目唯一的构建期外网依赖。

---

## 6. 打包安卓 APK

### 路线 A：本地打包（脚本全自动）

```
双击 5-打包APK.bat
```

或：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -InstallSdk -Mirror
```

- `-InstallSdk`：没有 Android SDK 时自动下载安装（约 600MB）
- `-Mirror`：Gradle 依赖走阿里云镜像，**国内必加**

流程：`next build (CAPACITOR_BUILD=1)` → `out/` → `cap sync` → `gradlew assembleDebug`
首次约 20~30 分钟，之后 2~3 分钟。产物：根目录 `farm-cooling-calculator-debug-<日期>.apk`

### 路线 B：Android Studio

先跑一次 `scripts\build-apk.ps1`（它会生成 `apk-build/android/` 工程），
然后 Android Studio 打开那个目录 → Build → Build APK(s)。

### 路线 C：在线转换（零本地依赖）⭐ 最省事

本项目自带 PWA（`public/manifest.json` + `public/sw.js`）：

1. 先部署到公网（第 3 节任选一种）
2. 打开 [PWABuilder](https://www.pwabuilder.com/) → 输入网址 → Package for stores → Android

缺点：内容来自线上，首次需要联网。路线 A/B 打出来的 APK 完全离线可用。

---

## 7. 常见问题

**Q：双击 bat 提示 `node 不是内部或外部命令`**
A：Node 装在 `D:\nodejs`，确认它在系统 PATH 里。新开一个终端窗口才会加载新的 PATH。

**Q：`bun run dev` 报 `tee: command not found`**
A：`package.json` 里的 dev 脚本带 `| tee dev.log`，那是 Linux 命令。
**用 `scripts\serve.ps1` 就没这个问题** —— 它直接调 next，日志自己写。

**Q：`next build` 卡在 Downloading / 字体报错**
A：`src/app/layout.tsx` 用了 `next/font/google`，构建时要联网下载 Geist 字体。
挂着失效代理会失败。先确认能访问 `fonts.googleapis.com`，或临时换成本地字体。

**Q：`out/` 没有生成**
A：忘了设 `DEPLOY_TARGET=cloudflare`。用 `scripts\build-static.ps1` 会自动设好。

**Q：静态导出报 `export const dynamic = "force-static" not configured on route "/api"`**
A：Next 16 要求 `output: export` 下的路由处理器显式声明为静态。
已在 `src/app/api/route.ts` 加上 `export const dynamic = "force-static"`，现在能正常导出。
以后再加动态接口（POST / 读数据库 / 带参数），静态导出就会再次失败 —— 那时改用 standalone 部署。

> 📌 这个错误以前一直存在，只是被旧脚本掩盖了：`deploy-cloudflare.sh` 里写的是
> `bun run build 2>&1 | tail -15`，管道让退出码变成 `tail` 的 0，构建失败也当成功继续跑，
> 结果 `out/` 根本没生成。**v3.3 已给该脚本加 `set -eo pipefail`**（管道失败会正确传播），
> 并另外检查 `out/` 是否存在，双保险。此外 `package.json` 的 `build` 脚本已改为静态导出安全
> （standalone 的 `cp` 用 `2>/dev/null … ; true` 兜底，export 模式不再因缺 `.next/standalone/` 而失败）。

**Q：3000 端口停不掉**
A：`next dev` 会派生子进程。`scripts\serve.ps1 stop` 用 `taskkill /T` 连子进程一起清。
还不行就 `Get-NetTCPConnection -LocalPort 3000` 查 PID 手动杀。

**Q：`git push` 失败**
A：当前仓库 origin 是 SSH（`git@github.com:...`），需要本机配好密钥：`ssh -T git@github.com`。
想换 HTTPS：`scripts\push-github.ps1 -UseHttps`。
另外本机对 GitHub 访问受限，失败常见，确认代理软件已启动。

**Q：当前在 `Linux` 分支，会不会推错**
A：`scripts\push-github.ps1` **默认推当前分支**，不硬编码。
要推 main 加 `-Branch main`。（旧的 `_github.bat` 硬编码 Linux，`git-push.sh` 硬编码 main，
两个脚本行为不一致，容易推错——新脚本已修正。）

**Q：`.desktop` 快捷方式点了没反应**
A：仓库里那几个 `.desktop` 的 Exec 路径写死成 `/home/z/my-project/...`，是旧开发容器的路径。
Linux 上跑 `./scripts/install-desktop-entries.sh` 重新生成正确路径的版本。

---

## 附：文件清单

```
scripts/                          跨平台脚本
├─ _lib.ps1                       公共函数（Windows）
├─ menu.ps1                       一键菜单
├─ serve.ps1     / serve.sh                本地服务（dev/prod/static 三种模式）
├─ build-static.ps1 / build-static.sh      静态导出 out/
├─ build-standalone.ps1 / .sh              standalone 构建
├─ push-github.ps1  / push-github.sh       推送 GitHub（本地优先）
├─ deploy-cloudflare.ps1 / .sh             部署 Cloudflare Pages
├─ build-apk.ps1                           打包 APK
├─ static-server.cjs                       零依赖静态服务器（预览 out/）
└─ install-desktop-entries.sh               Linux 桌面快捷方式（修正死路径）

deploy/                           部署配置
├─ Dockerfile                     standalone 版镜像（约 180MB）
├─ Dockerfile.static              静态版镜像（约 50MB，推荐）
├─ docker-compose.yml             一条命令起容器
├─ nginx.conf                     nginx 配置（静态 + 反代两套）
├─ Caddyfile                      Caddy 配置（自动 HTTPS）
├─ farm-cooling.service           systemd 单元（含安全加固）
├─ install-linux.sh               Linux 一键部署（四种方案）
├─ gradle-mirror.init.gradle      Gradle 阿里云镜像
├─ netlify.toml / vercel.json     其它平台配置

.github/workflows/                CI 自动部署
├─ deploy-cloudflare.yml
└─ deploy-pages.yml
```

### 与旧脚本的关系

根目录的 `serve.sh` / `git-push.sh` / `deploy-cloudflare.sh` / `_github.bat` 是旧版，
**只能在特定环境跑**且有几处行为不一致（见上面 FAQ）。新脚本全在 `scripts/` 下，
Windows 和 Linux 行为一致。旧脚本没有删除，确认新脚本可用后可以自行清理。
