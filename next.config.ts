import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 釘住 workspace root,避免被外圍 /home/anr2/package-lock.json 誤判
  turbopack: {
    root: __dirname,
  },
  // 關閉開發模式左下角的 Next.js 指示器(N)
  devIndicators: false,
  // Next 16 預設擋跨來源 dev 資源(/_next/*、webpack-hmr)。docker host 網路下
  // 從 localhost / LAN / Tailscale IP 存取時資源被擋會導致前端不 hydrate(按鈕按不動),
  // 故明列允許的開發來源。僅影響本機開發。
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.94',
    '100.84.105.43',
    'anr2-ThinkPad-X1-Carbon-Gen-12',
  ],
};

export default nextConfig;
