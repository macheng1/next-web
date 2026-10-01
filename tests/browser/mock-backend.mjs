import { createServer } from "node:http";
const tenant = {
  name: "Review Company",
  intro: "Manufacturing",
  navbar: {},
  products: [],
  jobs: [],
  homeConfig: {
    heroImage: "https://macheng123.oss-cn-hangzhou.aliyuncs.com/review.mp4",
  },
};
createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  const data = req.url.endsWith("/init")
    ? tenant
    : req.url.includes("/products/")
      ? { id: "part-1", name: "Review Part", specs: {} }
      : { status: "ok" };
  res.end(JSON.stringify({ code: 200, data }));
}).listen(4177, "127.0.0.1");
