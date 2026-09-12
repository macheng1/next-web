const nextConfig = {
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
    "@douyinfe/semi-illustrations",
  ],
};

export default nextConfig;
