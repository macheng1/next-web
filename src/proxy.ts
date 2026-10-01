import { NextRequest, NextResponse } from 'next/server';
import { buildSecurityHeaders } from '@/src/lib/security/headers';
import { resolveLanguage, isLocale } from '@/src/lib/i18n/locale';
export function proxy(req:NextRequest) {
 const segments=req.nextUrl.pathname.split('/').filter(Boolean);
 const portal=segments[0]==='portal' && segments.length>=2;
 const locale=resolveLanguage({pathLocale:portal?segments[2]:undefined,cookieLocale:req.cookies.get('NEXT_LOCALE')?.value,acceptLanguage:req.headers.get('accept-language') || undefined});
 const nonce=Buffer.from(crypto.randomUUID()).toString('base64');
 const security=buildSecurityHeaders({production:process.env.NODE_ENV==='production',nonce});
 const forwarded=new Headers(req.headers);forwarded.set('x-site-locale',locale);forwarded.set('x-nonce',nonce);forwarded.set('Content-Security-Policy',security[0].value);
 let response:NextResponse;
 if(portal && !isLocale(segments[2])) {
  const url=req.nextUrl.clone();url.pathname=`/portal/${segments[1]}/${locale}${segments.length>3?'/'+segments.slice(3).join('/'):''}`;
  response=NextResponse.redirect(url);
 } else response=NextResponse.next({request:{headers:forwarded}});
 for(const header of security)response.headers.set(header.key,header.value);return response;
}
export const config={matcher:['/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|woff2?|css|js)$).*)']};
