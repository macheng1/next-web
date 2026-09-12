import type { Metadata } from "next";
import { AuthShell } from "@/src/components/AuthShell";
import { ResetPasswordForm } from "@/src/components/ResetPasswordForm";
import { getDictionary } from "@/src/dictionaries";
import { resolveLocale } from "@/src/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveLocale());
  return {
    title: dict.auth.reset.title,
    description: dict.auth.reset.subtitle,
    robots: { index: false, follow: false },
  };
}

/**
 * 重置密码页 —— 忘记密码邮件的落地页。
 *
 * 后端邮件里的链接格式是 `<WEB_RESET_PASSWORD_URL>?token=xxx`（§7.3），
 * 所以 `token` 从 query 里取，取不到就让表单进「链接无效」态
 * （用户直接敲 URL、或邮件客户端截断链接都会落到这一支）。
 *
 * token 本身不做任何前端校验：它是不是有效、有没有过期，只有后端知道（§7.4）。
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const [lang, query] = await Promise.all([resolveLocale(), searchParams]);
  const dict = await getDictionary(lang);

  const raw = query.token;
  const token = typeof raw === "string" && raw.trim() ? raw.trim() : null;

  return (
    <AuthShell brand={dict.auth.brand}>
      <ResetPasswordForm dict={dict.auth} token={token} />
    </AuthShell>
  );
}
