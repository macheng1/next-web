import { NextRequest, NextResponse } from "next/server";
import { buildSecurityHeaders } from "@/src/lib/security/headers";
import { isLocale, resolveLanguage } from "@/src/lib/i18n/locale";
export function proxy(req: NextRequest) {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const resetLanguage = segments[0] === "reset-password" ? req.nextUrl.searchParams.get("lang") : null;
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
  const cleanResetUrl = req.nextUrl.clone();
  cleanResetUrl.searchParams.delete("lang");
  const response = isLocale(resetLanguage)
    ? NextResponse.redirect(cleanResetUrl)
    : invalidCatalogId
    ? NextResponse.rewrite(new URL("/catalog-not-found", req.url), {
        status: 404,
        request: { headers: forwarded },
      })
    : NextResponse.next({ request: { headers: forwarded } });
  if (isLocale(resetLanguage)) {
    response.cookies.set("NEXT_LOCALE", resetLanguage, {
      path: "/", maxAge: 31536000, sameSite: "lax", secure: req.nextUrl.protocol === "https:",
    });
  }
  for (const header of security) response.headers.set(header.key, header.value);
  if (["login", "register", "forgot-password", "reset-password", "account"].includes(segments[0] || "")) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}
export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|woff2?|css|js)$).*)",
  ],
};
