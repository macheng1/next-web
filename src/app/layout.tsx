import { buildMetadata } from "@/src/lib/seo/metadata";
import { foundationCopy } from "@/src/lib/i18n/foundation";
import { Providers } from "@/src/components/Providers";
import { resolveLocale } from "@/src/lib/locale";
import type { Metadata } from "next";
import "./globals.css";

// 字体：按《商汇黄页-01-设计规范》§03 使用纯系统字体栈
// （中文宋体标题 + 系统无衬线正文，定义在 src/styles/tokens.css 的 --font-display / --font-sans）。
// 原先这里通过 next/font/google 加载 Geist / Geist_Mono，但两个 CSS 变量在项目里从未被引用，
// 既违反「系统字体」要求，又让每次构建都必须能访问 Google Fonts。已移除。

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale(); const copy = foundationCopy(locale);
  return buildMetadata({title:copy.siteTitle,description:copy.siteDescription,path:"/",locale});
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveLocale();
  return (
    // 浏览器翻译类扩展会在水合前往 html/body 注入 class，suppressHydrationWarning 仅忽略该层属性差异
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning><Providers locale={locale}>{children}</Providers></body>
    </html>
  );
}
