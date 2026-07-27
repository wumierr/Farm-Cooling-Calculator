# ============================================================
#  Dockerfile — Next.js standalone 版（带 Node 服务器）
#
#  适合: 自有服务器 / 需要将来加后端接口的场景
#  纯静态托管请改用 deploy/Dockerfile.static（镜像小 4 倍）
#
#  构建（在项目根目录执行）:
#    docker build -f deploy/Dockerfile -t farm-cooling-calculator .
#
#  运行:
#    docker run -d --name farm-cooling -p 3000:3000 --restart unless-stopped farm-cooling-calculator
#    访问 http://服务器IP:3000
#
#  最终镜像约 180MB（standalone 只带用到的依赖，不是整个 node_modules）
# ============================================================

# ---------- Stage 1: 装依赖 ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package.json ./
# 有 lock 就用 lock（可复现），没有就直接装
COPY bun.loc[k] package-lock.jso[n] ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; \
    else npm install --no-audit --no-fund; fi

# ---------- Stage 2: 构建 ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# standalone 模式：不设 DEPLOY_TARGET / CAPACITOR_BUILD
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

# ---------- Stage 3: 运行 ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
