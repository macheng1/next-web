import type { Metadata } from "next";
import { AuthShell } from "@/src/components/AuthShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { getDictionary } from "@/src/dictionaries";
import { resolveLocale } from "@/src/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveLocale());
  return {
    title: dict.auth.change.title,
    description: dict.auth.change.subtitle,
    robots: { index: false, follow: false },
  };
}

/**
 * 改密 / 强制改密页。
 *
 * 登录接口返回 `mustChangePassword=true` 时，登录表单会把人送到这里；
 * 会员中心里「修改密码」也复用同一页。接口要求登录态（web 端 Token），
 * BFF 会自己从 httpOnly Cookie 取，页面不需要做登录态判断
 * —— 真没登录时后端返 401，表单会提示「登录状态已过期」。
 */
export default async function ChangePasswordPage() {
  const dict = await getDictionary(await resolveLocale());

  return (
    <AuthShell brand={dict.auth.brand}>
      <ChangePasswordForm dict={dict.auth} />
    </AuthShell>
  );
}
