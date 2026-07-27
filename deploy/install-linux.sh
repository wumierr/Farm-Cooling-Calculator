#!/usr/bin/env bash
# ============================================================
#  install-linux.sh — Linux 服务器一条命令部署到公网
#
#  用法（在服务器上，项目目录内执行）:
#    sudo bash deploy/install-linux.sh                       # 交互选择
#    sudo bash deploy/install-linux.sh caddy  calc.example.com
#    sudo bash deploy/install-linux.sh nginx  calc.example.com
#    sudo bash deploy/install-linux.sh docker
#    sudo bash deploy/install-linux.sh node
#
#  五种方案:
#    caddy   静态版 + Caddy，有域名 -> 自动 HTTPS（推荐，最省心）
#    nginx   静态版 + nginx + certbot
#    docker  静态版容器，8080 端口，不污染系统
#    node    standalone + systemd，需要服务端运行时才选
#
#  ⚠ 本项目所有计算都在浏览器完成，没有服务端逻辑，
#    默认推荐"静态版"——省资源、启动快、几乎不会挂。
#
#  支持: Debian / Ubuntu / CentOS / RHEL / Rocky / Alma
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WEB_ROOT="/var/www/farm-cooling"
APP_ROOT="/opt/farm-cooling"
MODE="${1:-}"
DOMAIN="${2:-}"

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;36m'; N='\033[0m'
ok()   { echo -e "  ${G}[OK]${N}   $1"; }
err()  { echo -e "  ${R}[X]${N}    $1"; }
note() { echo -e "  ${Y}[i]${N}    $1"; }
step() { echo -e "\n${B}━━━ $1 ━━━${N}"; }

[ "$EUID" -eq 0 ] || { err "请用 root 或 sudo 执行"; exit 1; }

if   command -v apt-get >/dev/null 2>&1; then PKG=apt
elif command -v dnf     >/dev/null 2>&1; then PKG=dnf
elif command -v yum     >/dev/null 2>&1; then PKG=yum
else err "不支持的发行版（需要 apt / dnf / yum）"; exit 1; fi
ok "包管理器: $PKG"

pkg_install() {
  case "$PKG" in
    apt) DEBIAN_FRONTEND=noninteractive apt-get install -y "$@" ;;
    dnf) dnf install -y "$@" ;;
    yum) yum install -y "$@" ;;
  esac
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local major; major="$(node -v | sed 's/v\([0-9]*\).*/\1/')"
    [ "$major" -ge 18 ] && { ok "Node.js $(node -v)"; return 0; }
    note "Node.js 版本过低（需要 18+），正在升级 ..."
  else
    note "安装 Node.js 20 ..."
  fi
  if [ "$PKG" = "apt" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  else
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  fi
  pkg_install nodejs
  ok "Node.js $(node -v)"
}

open_firewall() {
  for p in "$@"; do
    if command -v ufw >/dev/null 2>&1; then ufw allow "$p"/tcp >/dev/null 2>&1 || true
    elif command -v firewall-cmd >/dev/null 2>&1; then firewall-cmd --permanent --add-port="$p"/tcp >/dev/null 2>&1 || true; fi
  done
  command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --reload >/dev/null 2>&1 || true
  ok "已尝试放行端口: $*"
}

install_web_root() {
  mkdir -p "$WEB_ROOT"
  rm -rf "${WEB_ROOT:?}"/*
  cp -r "$ROOT/out/." "$WEB_ROOT/"
  chmod -R a+rX "$WEB_ROOT"
  ok "静态文件已部署到 $WEB_ROOT"
}

# ---------- 交互选择 ----------
if [ -z "$MODE" ]; then
  echo ""
  echo "  请选择部署方案:"
  echo "    1) caddy   静态版 + 自动 HTTPS（推荐，需要域名）"
  echo "    2) nginx   静态版 + nginx + Let's Encrypt（需要域名）"
  echo "    3) docker  静态版容器，8080 端口，无需域名"
  echo "    4) node    standalone + systemd（需要服务端运行时才选）"
  echo ""
  read -rp "  输入序号 [1-4]: " sel
  case "$sel" in
    1) MODE=caddy ;; 2) MODE=nginx ;; 3) MODE=docker ;; 4) MODE=node ;;
    *) err "无效选择"; exit 1 ;;
  esac
fi

if { [ "$MODE" = "caddy" ] || [ "$MODE" = "nginx" ]; } && [ -z "$DOMAIN" ]; then
  read -rp "  输入你的域名（如 calc.example.com）: " DOMAIN
  [ -n "$DOMAIN" ] || { err "域名不能为空"; exit 1; }
fi

case "$MODE" in
  # ==========================================================
  caddy)
    step "方案 A: 静态版 + Caddy 自动 HTTPS"
    ensure_node
    bash "$ROOT/scripts/build-static.sh" cloudflare

    if ! command -v caddy >/dev/null 2>&1; then
      note "安装 Caddy ..."
      if [ "$PKG" = "apt" ]; then
        pkg_install debian-keyring debian-archive-keyring apt-transport-https curl gnupg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
          | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
          > /etc/apt/sources.list.d/caddy-stable.list
        apt-get update -qq && pkg_install caddy
      else
        pkg_install 'dnf-command(copr)' || true
        dnf copr enable -y @caddy/caddy || true
        pkg_install caddy
      fi
    fi

    install_web_root
    sed -e "s|calc\.example\.com|$DOMAIN|g" \
        -e "s|/var/www/farm-cooling|$WEB_ROOT|g" \
        "$ROOT/deploy/Caddyfile" > /etc/caddy/Caddyfile
    mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy 2>/dev/null || true
    open_firewall 80 443
    systemctl enable --now caddy
    systemctl reload caddy || systemctl restart caddy
    ok "部署完成 -> https://$DOMAIN"
    note "证书由 Caddy 自动申请续期。打不开先确认域名 A 记录已指向本机公网 IP"
    ;;

  # ==========================================================
  nginx)
    step "方案 B: 静态版 + nginx + Let's Encrypt"
    ensure_node
    bash "$ROOT/scripts/build-static.sh" cloudflare
    command -v nginx >/dev/null 2>&1 || pkg_install nginx
    install_web_root

    sed -e "s|server_name  _;|server_name  $DOMAIN;|" \
        -e "s|/usr/share/nginx/html|$WEB_ROOT|" \
        "$ROOT/deploy/nginx.conf" > /etc/nginx/conf.d/farm-cooling.conf
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    nginx -t
    open_firewall 80 443
    systemctl enable --now nginx
    systemctl reload nginx
    ok "HTTP 已可访问 -> http://$DOMAIN"

    note "申请 HTTPS 证书 ..."
    command -v certbot >/dev/null 2>&1 || pkg_install certbot python3-certbot-nginx || true
    if command -v certbot >/dev/null 2>&1; then
      certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
        --register-unsafely-without-email --redirect || \
        note "certbot 失败，可稍后手动执行: certbot --nginx -d $DOMAIN"
      ok "部署完成 -> https://$DOMAIN"
    else
      note "certbot 未安装，站点当前仅 HTTP"
    fi
    ;;

  # ==========================================================
  docker)
    step "方案 C: 静态版 Docker 容器"
    if ! command -v docker >/dev/null 2>&1; then
      note "安装 Docker ..."
      curl -fsSL https://get.docker.com | sh
      systemctl enable --now docker
    fi
    cd "$ROOT"
    docker build -f deploy/Dockerfile.static -t farm-cooling-calculator:static .
    docker rm -f farm-cooling 2>/dev/null || true
    docker run -d --name farm-cooling -p 8080:80 --restart unless-stopped farm-cooling-calculator:static
    open_firewall 8080
    IP="$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
    ok "部署完成 -> http://$IP:8080"
    note "要 HTTPS 请再套一层 Caddy/nginx 反代，或改用 caddy 方案"
    ;;

  # ==========================================================
  node)
    step "方案 D: standalone + systemd"
    ensure_node
    bash "$ROOT/scripts/build-standalone.sh"

    id webapp >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin webapp
    rm -rf "$APP_ROOT"
    mkdir -p "$APP_ROOT"
    cp -r "$ROOT/.next/standalone/." "$APP_ROOT/"
    chown -R webapp:webapp "$APP_ROOT"

    cp "$ROOT/deploy/farm-cooling.service" /etc/systemd/system/
    # 直接对公网暴露时改监听地址
    sed -i 's|Environment=HOSTNAME=127.0.0.1|Environment=HOSTNAME=0.0.0.0|' /etc/systemd/system/farm-cooling.service
    systemctl daemon-reload
    systemctl enable --now farm-cooling
    open_firewall 3000
    sleep 3
    systemctl is-active --quiet farm-cooling && ok "服务运行中" || {
      err "服务启动失败"; journalctl -u farm-cooling -n 30 --no-pager; exit 1; }
    IP="$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
    ok "部署完成 -> http://$IP:3000"
    note "生产环境建议在前面加 nginx/Caddy 反代并配 HTTPS（见 deploy/nginx.conf 末尾注释）"
    ;;

  *) err "未知方案: $MODE"; exit 1 ;;
esac

echo ""
step "完成"
echo "  更新站点内容:"
echo "    caddy/nginx : bash scripts/build-static.sh && cp -r out/. $WEB_ROOT/"
echo "    docker      : docker compose -f deploy/docker-compose.yml up -d --build web-static"
echo "    node        : bash scripts/build-standalone.sh && cp -r .next/standalone/. $APP_ROOT/ && systemctl restart farm-cooling"
