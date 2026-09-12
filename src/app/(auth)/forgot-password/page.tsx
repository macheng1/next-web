import type { Metadata } from "next";
import { AuthShell } from "@/src/components/AuthShell";
import { ForgotPasswordForm } from "@/src/components/ForgotPasswordForm";
import { getDictionary } from "@/src/dictionaries";
import { resolveLocale } from "@/src/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveLocale());
  return {
    title: dict.auth.forgot.title,
    description: dict.auth.forgot.subtitle,
    robots: { index: false, follow: false },
  };
}

/**
 * 重置密码页。
 *
 * 登录页的「忘记密码？」直接指向这里 —— 认证流程里最容易被漏掉的一环，
 * 但少了它链接就会是死链，所以一并搭起来（表单结构与登录 / 注册同源）。
 */
export default async function ForgotPasswordPage() {
  const dict = await getDictionary(await resolveLocale());

  return (
    <AuthShell brand={dict.auth.brand}>
      <ForgotPasswordForm dict={dict.auth} />
    </AuthShell>
  );
}
