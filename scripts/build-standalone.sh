#!/usr/bin/env bash
# ============================================================
#  build-standalone.sh — 构建 Node 独立服务器版（.next/standalone）
#  用法: ./scripts/build-standalone.sh
#
#  产物自带精简 node_modules，服务器上 `node server.js` 即可运行，
#  不需要再装依赖。适合自有 VPS / Docker 部署。
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
ok()   { echo -e "  ${G}[OK]${N}   $1"; }
note() { echo -e "  ${Y}[i]${N}    $1"; }
err()  { echo -e "  ${R}[X]${N}    $1"; }

# 代理端口没人监听时才清掉——挂着死代理会让 npm/bun 报出很难懂的错
proxy_guard() {
  local p="${HTTPS_PROXY:-${HTTP_PROXY:-${https_proxy:-${http_proxy:-}}}}"
  [ -z "$p" ] && return 0
  local hp="${p#*://}"; hp="${hp%%/*}"
  local h="${hp%%:*}"; local pt="${hp##*:}"
  if timeout 1 bash -c "</dev/tcp/$h/$pt" 2>/dev/null; then return 0; fi
  unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
  note "代理 $p 无响应，已临时清除代理变量"
}
proxy_guard

if [ ! -d node_modules ]; then
  note "安装依赖 ..."
  if command -v bun >/dev/null 2>&1; then bun install; else npm install --no-audit --no-fund; fi
fi

NEXT="$ROOT/node_modules/.bin/next"
[ -x "$NEXT" ] || { err "找不到 node_modules/.bin/next"; exit 1; }

unset DEPLOY_TARGET CAPACITOR_BUILD 2>/dev/null || true
export NODE_ENV=production

note "执行 next build（standalone 模式）..."
"$NEXT" build

SA="$ROOT/.next/standalone"
[ -d "$SA" ] || { err ".next/standalone 未生成"; exit 1; }

note "复制静态资源到 standalone ..."
mkdir -p "$SA/.next"
rm -rf "$SA/.next/static" "$SA/public"
cp -r "$ROOT/.next/static" "$SA/.next/static"
[ -d "$ROOT/public" ] && cp -r "$ROOT/public" "$SA/public"

ok "构建完成: $SA  ($(du -sh "$SA" | cut -f1))"
echo ""
echo "  本机试跑: node .next/standalone/server.js"
echo "  服务器部署: 见 deploy/farm-cooling.service 或 deploy/Dockerfile"
