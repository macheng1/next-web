import { buildSecurityHeaders } from "./src/lib/security/headers";
const nextConfig = {
  agentRules: false,
  /**
   * 通过局域网 IP（如手机/其他电脑访问 http://192.168.2.9:3000）调试时，
   * Next dev server 默认只放行 localhost 来源，HMR WebSocket 与字体等带 Origin
   * 头的请求会被 403 拦截。此处放行本机局域网地址；IP 变化时需同步调整。
   */
  allowedDevOrigins: ["192.168.2.9"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders({
          production: process.env.NODE_ENV === "production",
          https: process.env.DEPLOYMENT_ENV === "production",
        }).filter((h) => h.key !== "Content-Security-Policy"),
      },
    ];
  },
  /**
   * 构建产物目录。默认 `.next`，但 `next build` 会重建整个目录 —— 如果此时本地还跑着
   * `next dev`，dev 的 turbopack 持久化缓存（`.next/dev` 下的 *.sst）会被一并清掉，
   * 之后 dev 就报「Failed to restore task data … Unable to open static sorted file xxx.sst」。
   * 所以验证性构建请用独立目录：`npm run build:verify`（= NEXT_DIST_DIR=.next-verify）。
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "macheng123.oss-cn-hangzhou.aliyuncs.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "macheng123.oss-cn-hangzhou.aliyuncs.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  transpilePackages: [
    "@douyinfe/semi-ui-19",
    "@douyinfe/semi-icons",
  ],
};

export default nextConfig;
