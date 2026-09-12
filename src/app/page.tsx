import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/src/dictionaries";
import { resolveLocale } from "@/src/lib/locale";

/**
 * 平台首页（根路由 `/`）—— 当前是**空白占位页**。
 *
 * 之所以先把它建起来：登录 / 注册成功后的落地地址就是 `/`
 * （`LoginForm` 的 `redirectTo` 默认 `/`，`/login?redirect=` 缺省也回落 `/`），
 * 之前没有这个文件，登录成功会直接撞 404。
 *
 * 真实首页（企业检索、需求撮合、行业名录等）设计好之后，直接替换本文件内容即可，
 * 路由与布局都不用再动。现在只保留「品牌 + 空白版位 + 登录/注册出口」。
 *
 * 放在根级而不是 `/portal/{domain}/{lang}` 下：门户站是**租户**主页，
 * 平台首页不隶属任何租户（与 `(auth)` 认证页同一套理由）。
 */
export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveLocale());
  return {
    title: dict.home.title,
    description: dict.home.slogan,
  };
}

export default async function HomePage() {
  const dict = await getDictionary(await resolveLocale());
  const { home, nav, auth } = dict;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-5 py-16">
      {/* 品牌：方形标记 + 宋体标题（规范 §03 双字体策略） */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-[46px] shrink-0 place-items-center rounded-md border border-jade-200 bg-jade-100 font-display text-[21px] font-bold text-jade-900"
        >
          {home.mark}
        </span>
        <h1 className="font-display text-h1 text-jade-900">{home.title}</h1>
      </div>

      <p className="mt-4 text-body text-ink-600">{home.slogan}</p>

      {/* 空白版位：内容待设计，这里只用虚线框示意位置，不放假数据 */}
      <div className="mt-10 grid w-full max-w-[560px] place-items-center rounded-lg border border-dashed border-ink-200 bg-surface px-6 py-20 text-sub text-ink-400">
        {home.placeholder}
      </div>

      {/* 出口：保证占位页不是死胡同（规范 §10：可点区域 ≥46px 高） */}
      <nav className="mt-8 flex items-center gap-6 text-sub">
        <Link
          href="/login"
          className="inline-flex min-h-[46px] items-center font-semibold text-jade-700 transition-colors duration-[var(--t-fast)] hover:text-jade-800"
        >
          {nav.login}
        </Link>
        <Link
          href="/register"
          className="inline-flex min-h-[46px] items-center font-semibold text-jade-700 transition-colors duration-[var(--t-fast)] hover:text-jade-800"
        >
          {auth.login.toRegister}
        </Link>
      </nav>
    </main>
  );
}
