#!/bin/bash
# ============================================================
# 安装桌面快捷方式 — 自动检测项目路径并生成 .desktop 文件
# 用法: ./install-shortcuts.sh
# 下载项目后运行一次即可，之后双击 .desktop 使用
# ============================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }

# 项目根目录（脚本所在目录）
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
print_info "项目目录: $PROJECT_DIR"

# 生成 .desktop 文件函数
gen_desktop() {
  local name="$1"      # 文件名（不含.desktop）
  local display="$2"   # 显示名称
  local exec_cmd="$3"  # 执行命令
  local icon="$4"      # 图标文件名
  local terminal="$5"  # 是否需要终端

  cat > "$PROJECT_DIR/$name.desktop" << EOF
[Desktop Entry]
Name=$display
Comment=葡萄大棚降温剂最佳配比计算器
Exec=bash -c 'cd "$PROJECT_DIR" && $exec_cmd'
Icon=$PROJECT_DIR/public/$icon
Terminal=$terminal
Type=Application
Categories=Utility;
EOF
  chmod +x "$PROJECT_DIR/$name.desktop"
  print_ok "$name.desktop"
}

print_info "生成桌面快捷方式..."

gen_desktop "启动服务" "降温剂计算器-启动"   "./serve.sh start"        "icon-512.png" "true"
gen_desktop "停止服务" "降温剂计算器-停止"   "./serve.sh stop"         "icon-192.png" "true"
gen_desktop "打开网页" "降温剂计算器-打开"   "./serve.sh open"         "logo.svg"     "false"
gen_desktop "打包APK" "降温剂计算器-打包APK" "./apk-build/build-apk.sh" "icon-512.png" "true"
gen_desktop "推送GitHub" "降温剂计算器-推送GitHub" "./git-push.sh \"更新项目\"" "icon-192.png" "true"
gen_desktop "部署公网" "降温剂计算器-部署公网" "./deploy-cloudflare.sh"  "icon-512.png" "true"

echo ""
print_ok "完成！双击 .desktop 文件即可使用。"
echo ""
echo "  如果桌面环境不显示 .desktop 图标，右键 → 允许启动（Allow Launching）"
