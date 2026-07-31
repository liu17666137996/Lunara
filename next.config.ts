import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 占位头像是本地生成的 SVG（无用户输入内容），聊天图片/真实头像会走 R2 remotePatterns。
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.cloudflarestorage.com",
      },
    ],
  },
};

export default nextConfig;
