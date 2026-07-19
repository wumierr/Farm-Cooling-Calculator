import type { NextConfig } from "next";

// 三种构建模式：
// 1. dev/start（默认）→ 无 output，正常开发
// 2. CAPACITOR_BUILD=1 → 静态导出 + 相对路径（APK 用）
// 3. DEPLOY_TARGET=cloudflare → 静态导出 + 绝对路径（Cloudflare Pages 用）
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";
const isCloudflareDeploy = process.env.DEPLOY_TARGET === "cloudflare";
const isStaticExport = isCapacitorBuild || isCloudflareDeploy;

const nextConfig: NextConfig = {
  // 静态导出模式（APK 和 Cloudflare 共用）
  ...(isStaticExport
    ? {
        output: "export" as const,
        // APK 用相对路径（file://），Cloudflare 用默认绝对路径
        assetPrefix: isCapacitorBuild ? "./" : undefined,
        images: { unoptimized: true },
        trailingSlash: isCapacitorBuild,
      }
    : process.env.NODE_ENV === "production"
      ? { output: "standalone" as const }
      : {}),

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
