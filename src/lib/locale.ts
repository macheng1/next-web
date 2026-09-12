import "server-only";

import { cookies, headers } from "next/headers";
import type { Locale } from "@/src/dictionaries";

/** 与 src/proxy.ts 保持一致的语言清单 */
const LOCALES: readonly Locale[] = ["zh", "en"];
const DEFAULT_LOCALE: Locale = "zh";

/**
 * 解析当前请求应使用的语言。
 *
 * 优先级与 `src/proxy.ts` 完全一致：Cookie(`NEXT_LOCALE`) → `Accept-Language` → 默认 `zh`。
 * 之所以不复用 proxy 的逻辑，是因为 proxy 只处理 `/portal/{domain}` 缺语言时的重定向，
 * 而登录 / 注册这类**不带语言段**的顶层路由需要自己判断该用哪份字典。
 *
 * 语言切换器写入的正是 `NEXT_LOCALE`，所以门户站切到英文后再进入登录页会自然延续。
 */
export async function resolveLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);

  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (cookieLocale && LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  const accept = headerList
    .get("accept-language")
    ?.split(",")?.[0]
    ?.split("-")?.[0]
    ?.toLowerCase();

  if (accept && LOCALES.includes(accept as Locale)) {
    return accept as Locale;
  }

  return DEFAULT_LOCALE;
}
