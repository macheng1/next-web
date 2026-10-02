import { NextRequest, NextResponse } from "next/server";
import { buildSecurityHeaders } from "@/src/lib/security/headers";
import { resolveLanguage } from "@/src/lib/i18n/locale";
export function proxy(req: NextRequest) {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const locale = resolveLanguage({
    pathLocale: segments[0],
    cookieLocale: req.cookies.get("NEXT_LOCALE")?.value,
    acceptLanguage: req.headers.get("accept-language") || undefined,
  });
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const security = buildSecurityHeaders({
    production: process.env.NODE_ENV === "production",
    nonce,
  });
  const forwarded = new Headers(req.headers);
  forwarded.set("x-site-locale", locale);
  forwarded.set("x-nonce", nonce);
  forwarded.set("Content-Security-Policy", security[0].value);
  const invalidCatalogId =
    /^(products|suppliers)$/.test(segments[0] || "") &&
    segments.length === 2 &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segments[1],
    );
  const response = invalidCatalogId
    ? NextResponse.rewrite(new URL("/catalog-not-found", req.url), {
        status: 404,
        request: { headers: forwarded },
      })
    : NextResponse.next({ request: { headers: forwarded } });
  for (const header of security) response.headers.set(header.key, header.value);
  return response;
}
export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|woff2?|css|js)$).*)",
  ],
};
