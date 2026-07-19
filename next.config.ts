import type { NextConfig } from "next";

// APK 打包时设置 CAPACITOR_BUILD=1，启用静态导出 + 相对路径
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  // dev 模式不设 output（避免路由问题）
  // build 时：APK 用 export，Web 用 standalone
  ...(isCapacitorBuild
    ? {
        output: "export" as const,
        assetPrefix: "./",
        images: { unoptimized: true },
        trailingSlash: true,
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
