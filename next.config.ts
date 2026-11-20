import type { NextConfig } from "next";

// NEXT_PUBLIC_DEMO=1 のときは GitHub Pages 用の静的サイトとして書き出す（scripts/build-demo.sh）
const demo = process.env.NEXT_PUBLIC_DEMO === "1";

const nextConfig: NextConfig = demo
  ? {
      output: "export",
      basePath: process.env.DEMO_BASE_PATH ?? "/Be-NatiBe",
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
