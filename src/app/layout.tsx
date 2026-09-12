import type { Metadata } from "next";
import "./globals.css";

// 字体：按《商汇黄页-01-设计规范》§03 使用纯系统字体栈
// （中文宋体标题 + 系统无衬线正文，定义在 src/styles/tokens.css 的 --font-display / --font-sans）。
// 原先这里通过 next/font/google 加载 Geist / Geist_Mono，但两个 CSS 变量在项目里从未被引用，
// 既违反「系统字体」要求，又让每次构建都必须能访问 Google Fonts。已移除。

export const metadata: Metadata = {
  title: "引智数链 PinLink",
  description: "赋能制造律动,链接工业未来",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
