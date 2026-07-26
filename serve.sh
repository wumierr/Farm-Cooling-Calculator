#!/bin/bash
# ============================================================
# 葡萄大棚降温剂计算器 — 本地服务管理脚本
# 用法: ./serve.sh [start|stop|restart|status|open]
# ============================================================

PORT=3000
PID_FILE=".server.pid"
LOG_FILE="dev.log"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_err()  { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }

get_pid() {
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo "$pid"
      return 0
    fi
  fi
  # 回退：查找占用端口的进程
  local pid=$(lsof -ti :$PORT 2>/dev/null | head -1)
  if [ -n "$pid" ]; then
    echo "$pid"
    return 0
  fi
  return 1
}

start_server() {
  local pid=$(get_pid)
  if [ -n "$pid" ]; then
    print_err "服务已在运行 (PID: $pid)，端口 $PORT 被占用"
    exit 1
  fi

  print_info "正在启动开发服务器 (端口 $PORT)..."
  nohup bun run dev > "$LOG_FILE" 2>&1 &
  local new_pid=$!
  echo "$new_pid" > "$PID_FILE"

  # 等待服务就绪（最多 30 秒）
  for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null | grep -q "200"; then
      print_ok "服务已启动 (PID: $new_pid)"
      echo ""
      echo "  网页地址: http://localhost:$PORT"
      echo "  日志文件: $LOG_FILE"
      echo ""
      echo "  停止服务: ./serve.sh stop"
      echo "  查看状态: ./serve.sh status"
      exit 0
    fi
    sleep 1
  done

  print_err "服务启动超时（30秒），请检查日志: $LOG_FILE"
  exit 1
}

stop_server() {
  local pid=$(get_pid)
  if [ -z "$pid" ]; then
    print_info "服务未在运行"
    rm -f "$PID_FILE"
    exit 0
  fi

  print_info "正在停止服务 (PID: $pid)..."
  kill "$pid" 2>/dev/null
  sleep 2

  # 如果还没死，强制杀
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null
    sleep 1
  fi

  rm -f "$PID_FILE"
  print_ok "服务已停止"
}

status_server() {
  local pid=$(get_pid)
  if [ -n "$pid" ]; then
    print_ok "服务运行中 (PID: $pid, 端口 $PORT)"
    # 测试响应
    local code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null)
    if [ "$code" = "200" ]; then
      print_ok "HTTP 响应正常 ($code)"
    else
      print_err "HTTP 响应异常 ($code)"
    fi
  else
    print_info "服务未在运行"
  fi
}

open_browser() {
  local pid=$(get_pid)
  if [ -z "$pid" ]; then
    print_err "服务未运行，请先启动: ./serve.sh start"
    exit 1
  fi
  print_info "正在打开浏览器..."
  # 尝试多种方式打开浏览器
  if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT" 2>/dev/null
  elif command -v sensible-browser &> /dev/null; then
    sensible-browser "http://localhost:$PORT" 2>/dev/null
  else
    print_info "请手动打开浏览器访问: http://localhost:$PORT"
  fi
}

case "$1" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    sleep 1
    start_server
    ;;
  status)
    status_server
    ;;
  open)
    open_browser
    ;;
  *)
    echo "葡萄大棚降温剂计算器 — 本地服务管理"
    echo ""
    echo "用法: ./serve.sh <命令>"
    echo ""
    echo "命令:"
    echo "  start    启动开发服务器（自动等待就绪）"
    echo "  stop     停止服务器"
    echo "  restart  重启服务器"
    echo "  status   查看运行状态"
    echo "  open     在浏览器中打开页面"
    echo ""
    echo "示例:"
    echo "  ./serve.sh start    # 启动服务并等待就绪"
    echo "  ./serve.sh open     # 打开浏览器"
    echo "  ./serve.sh stop     # 停止服务"
    exit 1
    ;;
esac
