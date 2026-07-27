#!/usr/bin/env bash
# ============================================================
#  install-desktop-entries.sh — 在 Linux 桌面生成正确路径的快捷方式
#
#  为什么需要: 仓库里那几个 .desktop 文件的 Exec 路径写死成
#              /home/z/my-project/...，那是当初开发容器里的路径，
#              换台机器就全部失效。本脚本按当前实际路径重新生成。
#
#  用法:
#    ./scripts/install-desktop-entries.sh              # 装到 ~/.local/share/applications
#    ./scripts/install-desktop-entries.sh ~/Desktop    # 同时放一份到桌面
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-$HOME/.local/share/applications}"
ICON="$ROOT/public/icon-512.png"

mkdir -p "$DEST"

make_entry() {
  local file="$1" name="$2" comment="$3" exec_cmd="$4" category="$5"
  cat > "$DEST/$file" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$name
Comment=$comment
Exec=bash -c '$exec_cmd; echo; read -n1 -r -p "按任意键关闭..."'
Path=$ROOT
Icon=$ICON
Terminal=true
Categories=$category
EOF
  chmod +x "$DEST/$file"
  echo "  [OK]   $DEST/$file"
}

echo "项目路径: $ROOT"
echo "安装到  : $DEST"
echo ""

make_entry "farm-cooling-start.desktop"  "降温剂计算器-启动"     "启动本地服务并打开网页" \
           "cd '$ROOT' && ./scripts/serve.sh start && ./scripts/serve.sh open" "Utility;"
make_entry "farm-cooling-open.desktop"   "降温剂计算器-打开网页" "在浏览器中打开" \
           "cd '$ROOT' && ./scripts/serve.sh open" "Utility;"
make_entry "farm-cooling-stop.desktop"   "降温剂计算器-停止"     "停止本地服务" \
           "cd '$ROOT' && ./scripts/serve.sh stop" "Utility;"
make_entry "farm-cooling-push.desktop"   "降温剂计算器-推送GitHub" "提交并推送到 GitHub（本地优先）" \
           "cd '$ROOT' && ./scripts/push-github.sh" "Development;"
make_entry "farm-cooling-deploy.desktop" "降温剂计算器-部署公网" "部署到 Cloudflare Pages" \
           "cd '$ROOT' && ./scripts/deploy-cloudflare.sh" "Development;"

echo ""
echo "完成。如果桌面图标显示"不受信任"，右键 -> 允许启动。"
echo "旧的 /home/z/my-project 路径的 .desktop 文件可以删掉了。"
