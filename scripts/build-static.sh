#!/usr/bin/env bash
# ============================================================
#  build-static.sh — 静态导出（产物 out/）
#  用法: ./scripts/build-static.sh [cloudflare|capacitor]
#
#    cloudflare（默认）: 绝对路径，适合 Pages / nginx / Netlify / Vercel
#    capacitor        : 相对路径 + trailingSlash，适合打进 APK
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
TARGET="${1:-cloudflare}"

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

rm -rf "$ROOT/out"

unset DEPLOY_TARGET CAPACITOR_BUILD 2>/dev/null || true
if [ "$TARGET" = "capacitor" ]; then
  export CAPACITOR_BUILD=1
  note "CAPACITOR_BUILD=1  ->  相对路径（APK 用）"
else
  export DEPLOY_TARGET=cloudflare
  note "DEPLOY_TARGET=cloudflare  ->  绝对路径（网站用）"
fi

note "执行 next build ..."
"$NEXT" build

[ -d "$ROOT/out" ] || { err "out/ 未生成"; exit 1; }

touch "$ROOT/out/.nojekyll"

if [ "$TARGET" != "capacitor" ]; then
cat > "$ROOT/out/_headers" <<'EOF'
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/icon-192.png
  Cache-Control: public, max-age=604800

/icon-512.png
  Cache-Control: public, max-age=604800

/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

/index.html
  Cache-Control: no-cache

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
EOF
ok "已写入 _headers"
fi

ok "构建完成: $ROOT/out  ($(du -sh "$ROOT/out" | cut -f1))"
