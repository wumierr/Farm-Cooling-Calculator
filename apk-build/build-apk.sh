#!/bin/bash
# ============================================================
# 葡萄大棚降温剂计算器 — APK 一键打包脚本
# 用法: ./app/build-apk.sh
# 产物: app/android/app/build/outputs/apk/debug/app-debug.apk
# ============================================================

set -e

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_err()  { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_step() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

APP_DIR="$ROOT_DIR/apk-build"
CONFIG_FILE="$APP_DIR/capacitor.config.json"
OUTPUT_APK="$APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk"

print_step "葡萄大棚降温剂计算器 — APK 打包"
echo "  项目根目录: $ROOT_DIR"
echo "  配置文件: $CONFIG_FILE"
echo ""

# ---- 检查配置 ----
if [ ! -f "$CONFIG_FILE" ]; then
  print_err "未找到 capacitor.config.json，请确认 app/ 目录存在"
  exit 1
fi

# ---- Step 1: 静态构建 ----
print_step "Step 1/5: 静态构建（Next.js export）"

print_info "设置 CAPACITOR_BUILD=1，启用静态导出模式..."
export CAPACITOR_BUILD=1

print_info "执行 next build..."
bun run build 2>&1 | tail -20

# 检查 out/ 目录
if [ ! -d "$ROOT_DIR/out" ]; then
  print_err "构建失败：out/ 目录不存在"
  exit 1
fi
print_ok "静态构建完成，输出到 out/"

# ---- Step 2: Capacitor 初始化（首次）----
print_step "Step 2/5: Capacitor 初始化"

if [ ! -d "$APP_DIR/android" ]; then
  print_info "首次运行，初始化 Android 平台..."
  cd "$APP_DIR"

  # cap init（配置文件已存在，跳过）
  if [ ! -f "capacitor.config.json" ]; then
    npx cap init "降温剂计算器" "com.grape.coolingcalc" --web-dir="../out"
  fi

  # 添加 Android 平台
  npx cap add android
  print_ok "Android 平台已添加"
else
  print_ok "Android 平台已存在，跳过初始化"
fi

# ---- Step 3: 同步资源 ----
print_step "Step 3/5: 同步静态资源到 Android 工程"

cd "$APP_DIR"
npx cap sync android
print_ok "资源同步完成"

# ---- Step 4: 编译 APK ----
print_step "Step 4/5: 编译 APK（首次会自动下载 JDK + SDK）"

print_info "调用 build-capacitor 自动构建..."
print_info "（首次运行需要下载 ~500MB 编译环境，请耐心等待）"

cd "$ROOT_DIR"
npx build-capacitor --platform android --config "$CONFIG_FILE" 2>&1 | tail -30

# ---- Step 5: 检查产物 ----
print_step "Step 5/5: 检查产物"

if [ -f "$OUTPUT_APK" ]; then
  FILESIZE=$(du -h "$OUTPUT_APK" | cut -f1)
  print_ok "APK 打包成功！"
  echo ""
  echo "  📦 APK 文件: $OUTPUT_APK"
  echo "  📏 文件大小: $FILESIZE"
  echo ""
  echo "  安装方法:"
  echo "    1. 将 APK 传到手机"
  echo "    2. 手机设置 → 开启「允许安装未知来源应用」"
  echo "    3. 点击安装"
  echo ""
  echo "  APK 已包含所有网页资源，安装后离线可用。"
else
  print_err "APK 文件未找到，请检查构建日志"
  print_info "预期路径: $OUTPUT_APK"
  exit 1
fi
