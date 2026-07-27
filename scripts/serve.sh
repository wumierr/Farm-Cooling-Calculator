#!/usr/bin/env bash
# ============================================================
#  serve.sh — 本地服务管理（Linux / macOS / WSL）
#  用法: ./scripts/serve.sh {start|stop|restart|status|open}
#  环境变量:
#    PORT=3000      端口
#    LAN=1          监听 0.0.0.0，局域网可访问
#    MODE=dev|prod|static
#                   dev(默认) 开发模式 / prod 生产模式 / static 静态导出预览
#
#  说明: 不走 package.json 的 dev 脚本（那个带 `| tee`，跨平台不可靠），
#        直接调 node_modules/.bin/next，日志自己写进 logs/。
# ============================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
MODE="${MODE:-dev}"
PID_FILE="$ROOT/.server.pid"
LOG_DIR="$ROOT/logs"
LOG_FILE="$LOG_DIR/server.out.log"
URL="http://localhost:$PORT"

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; D='\033[0;90m'; N='\033[0m'
ok()   { echo -e "  ${G}[OK]${N}   $1"; }
err()  { echo -e "  ${R}[X]${N}    $1"; }
note() { echo -e "  ${Y}[i]${N}    $1"; }
tip()  { echo -e "  ${D}       $1${N}"; }

pkg_manager() {
  if command -v bun >/dev/null 2>&1; then echo bun; else echo npm; fi
}

ensure_deps() {
  [ -d "$ROOT/node_modules" ] && return 0
  local pm; pm="$(pkg_manager)"
  note "首次运行，用 $pm 安装依赖（约 1~3 分钟）..."
  # 代理端口没人监听时才清掉——挂着死代理会让 npm/bun 报出很难懂的错
  local p="${HTTPS_PROXY:-${HTTP_PROXY:-${https_proxy:-${http_proxy:-}}}}"
  if [ -n "$p" ]; then
    local hp="${p#*://}"; hp="${hp%%/*}"
    if ! timeout 1 bash -c "</dev/tcp/${hp%%:*}/${hp##*:}" 2>/dev/null; then
      unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
      note "代理 $p 无响应，已临时清除代理变量"
    fi
  fi
  if [ "$pm" = "bun" ]; then bun install; else npm install --no-audit --no-fund; fi
}

next_bin() {
  if [ -x "$ROOT/node_modules/.bin/next" ]; then echo "$ROOT/node_modules/.bin/next"; else echo ""; fi
}

get_pid() {
  if [ -f "$PID_FILE" ]; then
    local p; p="$(cat "$PID_FILE" 2>/dev/null)"
    if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then echo "$p"; return 0; fi
  fi
  local p2=""
  if command -v lsof >/dev/null 2>&1; then
    p2="$(lsof -ti :"$PORT" -sTCP:LISTEN 2>/dev/null | head -1)"
  elif command -v ss >/dev/null 2>&1; then
    p2="$(ss -lptn "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1)"
  fi
  [ -n "$p2" ] && { echo "$p2"; return 0; }
  return 1
}

start_server() {
  local p; p="$(get_pid)" && { note "服务已在运行 (PID: $p) -> $URL"; return 0; }
  ensure_deps
  mkdir -p "$LOG_DIR"

  local bind="127.0.0.1"
  [ "${LAN:-0}" = "1" ] && bind="0.0.0.0"

  local nb; nb="$(next_bin)"
  [ -z "$nb" ] && { err "找不到 node_modules/.bin/next"; return 1; }

  case "$MODE" in
    static)
      note "静态导出模式：先构建 out/ ..."
      bash "$ROOT/scripts/build-static.sh" cloudflare || return 1
      BIND_HOST="$bind" nohup node "$ROOT/scripts/static-server.cjs" "$PORT" "$ROOT/out" >"$LOG_FILE" 2>&1 &
      ;;
    prod)
      note "生产模式：先 next build ..."
      "$nb" build || return 1
      nohup "$nb" start -p "$PORT" -H "$bind" >"$LOG_FILE" 2>&1 &
      ;;
    *)
      note "开发模式启动，端口 $PORT（首次编译约 20~60 秒）..."
      nohup "$nb" dev -p "$PORT" -H "$bind" >"$LOG_FILE" 2>&1 &
      ;;
  esac

  echo $! > "$PID_FILE"

  for _ in $(seq 1 180); do
    if curl -fsS -o /dev/null "$URL" 2>/dev/null; then
      ok "服务已启动 (PID: $(cat "$PID_FILE"), 模式: $MODE)"
      echo "    本机访问 : $URL"
      if [ "${LAN:-0}" = "1" ]; then
        local ip; ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
        [ -n "$ip" ] && echo "    局域网   : http://$ip:$PORT"
      fi
      echo "    日志     : $LOG_FILE"
      return 0
    fi
    sleep 1
  done
  err "服务启动超时"; tail -n 20 "$LOG_FILE" 2>/dev/null; return 1
}

stop_server() {
  local p; p="$(get_pid)" || { note "服务未在运行"; rm -f "$PID_FILE"; return 0; }
  note "正在停止服务 (PID: $p)..."
  # next dev 会派生子进程，先按进程组杀
  pkill -TERM -P "$p" 2>/dev/null || true
  kill "$p" 2>/dev/null || true
  sleep 1
  kill -0 "$p" 2>/dev/null && { pkill -KILL -P "$p" 2>/dev/null || true; kill -9 "$p" 2>/dev/null || true; }
  rm -f "$PID_FILE"
  ok "服务已停止"
}

status_server() {
  local p
  if p="$(get_pid)"; then
    ok "服务运行中 (PID: $p, 端口 $PORT)"
    local code; code="$(curl -s -o /dev/null -w '%{http_code}' "$URL" 2>/dev/null)"
    [ "$code" = "200" ] && ok "HTTP 正常 ($code) -> $URL" || err "HTTP 异常 ($code)"
  else
    note "服务未在运行（端口 $PORT 空闲）"
  fi
}

open_browser() {
  get_pid >/dev/null 2>&1 || start_server || return 1
  if   command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 &
  elif command -v open     >/dev/null 2>&1; then open "$URL" >/dev/null 2>&1 &
  else note "请手动访问: $URL"; fi
}

case "${1:-start}" in
  start)   start_server ;;
  stop)    stop_server ;;
  restart) stop_server; sleep 1; start_server ;;
  status)  status_server ;;
  open)    open_browser ;;
  *) echo "用法: $0 {start|stop|restart|status|open}"; exit 1 ;;
esac
