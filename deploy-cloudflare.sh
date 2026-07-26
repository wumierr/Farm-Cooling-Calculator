#!/bin/bash
# ============================================================
# 葡萄大棚降温剂计算器 — Cloudflare Pages 部署脚本
# 用法: ./deploy-cloudflare.sh
# ============================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_err()  { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_step() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

print_step "Cloudflare Pages 部署"

# ---- Step 1: 静态构建 ----
print_step "Step 1/3: 静态构建（Cloudflare 模式）"

export DEPLOY_TARGET=cloudflare
print_info "执行 next build..."
bun run build 2>&1 | tail -15

if [ ! -d "$ROOT_DIR/out" ]; then
  print_err "构建失败：out/ 目录不存在"
  exit 1
fi
print_ok "静态构建完成，输出到 out/"

# ---- Step 2: 检查 wrangler ----
print_step "Step 2/3: 部署到 Cloudflare Pages"

if ! command -v npx wrangler &> /dev/null && ! command -v wrangler &> /dev/null; then
  print_info "wrangler 未安装，正在安装..."
  bun add -d wrangler 2>&1 | tail -3
fi

# ---- Step 3: 部署 ----
print_info "正在部署到 Cloudflare Pages..."
print_info "（首次使用会提示登录 Cloudflare 账号）"

# 项目名：farm-cooling-calculator
npx wrangler pages deploy out --project-name=farm-cooling-calculator 2>&1 | tail -20

print_ok "部署完成！"
echo ""
echo "  🌐 Cloudflare 会在几分钟内分配域名，如："
echo "     https://farm-cooling-calculator.pages.dev"
echo ""
echo "  后续更新只需重新执行："
echo "     ./deploy-cloudflare.sh"
