import type { Metadata } from "next";
import { AuthShell } from "@/src/components/AuthShell";
import { LoginForm } from "@/src/components/LoginForm";
import { getDictionary } from "@/src/dictionaries";
import { resolveLocale } from "@/src/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveLocale());
  return {
    title: dict.auth.login.title,
    description: dict.auth.login.subtitle,
    // 认证页不进搜索引擎索引
    robots: { index: false, follow: false },
  };
}

/** 只接受站内相对路径，避免 ?redirect= 被用来做开放重定向 */
function safeRedirect(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const [lang, query] = await Promise.all([resolveLocale(), searchParams]);
  const dict = await getDictionary(lang);

  return (
    <AuthShell brand={dict.auth.brand}>
      <LoginForm dict={dict.auth} redirectTo={safeRedirect(query.redirect)} />
    </AuthShell>
  );
}
