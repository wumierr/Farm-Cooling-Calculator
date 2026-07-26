#!/bin/bash
# ============================================================
# 葡萄大棚降温剂计算器 — GitHub 一键推送脚本
# 用法: ./git-push.sh "提交说明"
# ============================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_err()  { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"
REPO_URL="https://github.com/wumierr/Farm-Cooling-Calculator.git"

# 提交说明
COMMIT_MSG="${1:-更新项目}"

# 检查 git 是否初始化
if [ ! -d ".git" ]; then
  print_info "初始化 Git 仓库..."
  git init
  git branch -M main
fi

# 检查 remote 是否设置
if ! git remote get-url origin &> /dev/null; then
  print_info "添加远程仓库..."
  git remote add origin "$REPO_URL"
else
  # 更新为正确的 URL
  git remote set-url origin "$REPO_URL"
fi

print_info "添加文件..."
git add -A

print_info "提交: $COMMIT_MSG"
git commit -m "$COMMIT_MSG" || print_info "无变更需要提交"

print_info "推送到 GitHub..."
git push -u origin main

print_ok "推送完成！"
echo ""
echo "  仓库地址: https://github.com/wumierr/Farm-Cooling-Calculator"
