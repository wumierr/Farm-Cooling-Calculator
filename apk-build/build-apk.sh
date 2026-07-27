#!/usr/bin/env bash
# ============================================================
# 葡萄大棚降温剂计算器 — APK 一键打包脚本（Linux / macOS）
#
# 用法: ./apk-build/build-apk.sh
# 产物: apk-build/android/app/build/outputs/apk/debug/app-debug.apk
#
# 依赖（Capacitor 7）：
#   · Node.js 18+ 与 bun（或 npm）
#   · JDK 21           ← Capacitor 7/8 强制要求（不是 17！）
#   · Android SDK：platforms;android-35 + build-tools;35.0.0（Capacitor 7）
#     Windows 用户用 scripts\build-apk.ps1 -InstallSdk 可自动装 SDK；
#     Linux/macOS 请用系统包管理器或 Android Studio 装好 SDK 后再跑本脚本。
#
# 关键修复（v3.3）：
#   · 不再用 `bun run build`——那会触发 package.json 里 standalone 的 cp，
#     静态导出模式下没有 .next/standalone/ 会直接失败。改用 build-static.sh。
#   · set -o pipefail：管道里任一步失败都会让脚本失败（不再吞退出码）。
#   · 去掉 @ea-utilities/build-capacitor 封装，直接 gradlew assembleDebug。
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_err()  { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_step() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_DIR="$ROOT_DIR/apk-build"
CONFIG_FILE="$APP_DIR/capacitor.config.json"
ANDROID_DIR="$APP_DIR/android"
OUTPUT_APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"

print_step "葡萄大棚降温剂计算器 — APK 打包（Capacitor 7）"
echo "  项目根目录: $ROOT_DIR"

[ -f "$CONFIG_FILE" ] || { print_err "未找到 $CONFIG_FILE"; exit 1; }

# ---- Step 0: 前置环境检查（JDK 21 / Android SDK） ----
print_step "Step 0/5: 环境检查"
if ! command -v java >/dev/null 2>&1; then
  print_err "未找到 Java。Capacitor 7 需要 JDK 21。"
  print_info "安装：https://adoptium.net/temurin/releases/?version=21 （或随 Android Studio 附带的 JDK 21）"
  exit 1
fi
JAVA_VER="$(java -version 2>&1 | head -1)"
print_ok "Java: $JAVA_VER"
case "$JAVA_VER" in
  *\"21*|*\"22*|*\"23*) : ;;  # 21+ 均可
  *) print_info "警告：检测到的 Java 可能不是 21。Capacitor 7 Android 构建需要 JDK 21，否则会报 'invalid source release: 21'。" ;;
esac
if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ]; then
  print_info "未设置 ANDROID_HOME/ANDROID_SDK_ROOT。请确保已装 Android SDK（platforms;android-35 + build-tools;35.0.0）并导出该变量。"
fi

# ---- Step 1: 静态导出（走 build-static.sh，export 安全） ----
print_step "Step 1/5: 静态构建（Next.js export，CAPACITOR_BUILD=1）"
bash "$ROOT_DIR/scripts/build-static.sh" capacitor
[ -d "$ROOT_DIR/out" ] || { print_err "构建失败：out/ 不存在"; exit 1; }
print_ok "静态资源已生成到 out/"

# ---- Step 2: Capacitor 初始化（首次） ----
print_step "Step 2/5: Capacitor Android 平台"
cd "$APP_DIR"
if [ ! -d "$ANDROID_DIR" ]; then
  print_info "首次运行，添加 Android 平台 ..."
  npx --yes cap add android
  print_ok "Android 平台已添加"
else
  print_ok "Android 平台已存在"
fi

# ---- Step 3: 同步资源 ----
print_step "Step 3/5: 同步静态资源到 Android 工程"
npx --yes cap sync android
print_ok "资源同步完成"

# ---- Step 4: Gradle 编译（直接 gradlew，不再用第三方封装） ----
print_step "Step 4/5: 编译 APK（首次会下载 Gradle 依赖，请耐心等待）"
cd "$ANDROID_DIR"
# 写入 SDK 路径（若已设置环境变量）
if [ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]; then
  echo "sdk.dir=${ANDROID_HOME:-$ANDROID_SDK_ROOT}" > local.properties
fi
chmod +x ./gradlew 2>/dev/null || true
./gradlew assembleDebug --no-daemon --warning-mode=none
cd "$ROOT_DIR"

# ---- Step 5: 检查产物 ----
print_step "Step 5/5: 检查产物"
if [ -f "$OUTPUT_APK" ]; then
  OUT_NAME="farm-cooling-calculator-debug-$(date +%Y%m%d).apk"
  cp -f "$OUTPUT_APK" "$ROOT_DIR/$OUT_NAME"
  print_ok "APK 打包成功！"
  echo "  📦 $ROOT_DIR/$OUT_NAME  ($(du -h "$OUTPUT_APK" | cut -f1))"
  echo "  安装：传到手机 → 允许「安装未知来源应用」→ 点击安装（离线可用）"
else
  print_err "未找到 APK，预期：$OUTPUT_APK"
  print_info "常见原因：JDK 非 21 / SDK 未装 android-35 / 依赖下载超时（重试或换镜像）"
  exit 1
fi
