import { buildSecurityHeaders } from "@/src/lib/security/headers";
// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

const locales = ["zh", "en"];
const defaultLocale = "zh";

// 💡 必须导出名为 proxy 的函数以解决 Build Error
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const security = buildSecurityHeaders({ production: process.env.NODE_ENV === "production", nonce });
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", security[0].value);
  const next = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    for (const header of security) response.headers.set(header.key, header.value);
    return response;
  };

  // 1. 更加严谨的静态资源排除
  // 排除 _next, api, 以及带有扩展名的公共文件 (如 .png, .ico)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.[^/]+$/.test(pathname)
  ) {
    return next();
  }

  // 2. 增强版门户路径处理 (/portal/[domain])
  if (pathname.startsWith("/portal")) {
    const segments = pathname.split("/").filter(Boolean);

    // 情况 A: 只有 /portal (长度为1) -> 可能是非法访问或主页，保持现状或跳转
    if (segments.length === 1) return next();

    // 情况 B: 路径为 /portal/wuxi-yuansi (长度为2)，缺少语言参数
    if (segments.length === 2) {
      // 优先级：Cookie > 浏览器 Header > 默认语言
      const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
      const acceptLang = req.headers
        .get("accept-language")
        ?.split(",")?.[0]
        ?.split("-")?.[0];
      const locale =
        cookieLocale ||
        (locales.includes(acceptLang || "") ? acceptLang : defaultLocale);

      // 规范化 URL 拼接，防止双斜杠
      const redirectUrl = new URL(req.url);
      redirectUrl.pathname = `/portal/${segments[1]}/${locale}`;

      return NextResponse.redirect(redirectUrl);
    }

    // 情况 C: 路径已包含语言 /portal/wuxi-yuansi/zh (长度为3)，直接放行
  }

  return next();
}

// 配置匹配器
export const config = {
  matcher: [
    // 拦截所有路径，排除掉静态资源
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
