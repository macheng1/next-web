import type { Metadata } from "next";
import { AuthShell } from "@/src/components/AuthShell";
import { RegisterForm } from "@/src/components/RegisterForm";
import { getDictionary } from "@/src/dictionaries";
import { resolveLocale } from "@/src/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveLocale());
  return {
    title: dict.auth.register.title,
    description: dict.auth.register.subtitle,
    robots: { index: false, follow: false },
  };
}

/**
 * 企业注册页。
 *
 * 没有 `?redirect=` —— 注册**不会建立登录态**（后端审核通过后才邮件下发初始密码），
 * 提交成功是切到「申请已提交」结果态，而不是跳转，所以也没有回跳地址可谈。
 * 回跳能力留在登录页（那里才真的产生登录态）。
 *
 * `cardWidth={680}`：六个字段走两列栅格，420 装不下（每列只剩 178px，占位文案会碎）。
 */
export default async function RegisterPage() {
  const dict = await getDictionary(await resolveLocale());

  return (
    <AuthShell brand={dict.auth.brand} cardWidth={680}>
      <RegisterForm dict={dict.auth} />
    </AuthShell>
  );
}
