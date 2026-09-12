"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Dictionary } from "@/src/dictionaries";
import { Button } from "@/src/components/Button";
import { Field } from "@/src/components/Field";
import { AuthHeading, AuthNotice } from "@/src/components/AuthShell/parts";
import { login, resolveAuthError } from "@/src/lib/auth-api";

type AuthDict = Dictionary["auth"];

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginFormProps {
  dict: AuthDict;
  /** 登录成功后的落地地址 */
  redirectTo?: string;
  /** 「忘记密码」入口；传 `null` 则整块不渲染 */
  forgotHref?: string | null;
  /**
   * 强制改密页。
   * 后端 `mustChangePassword=true` 时（首次审核通过后拿初始密码登录），
   * 除改密与查认证状态外，其余接口一律 403 —— 所以必须先把人送去改密。
   */
  changePasswordHref?: string;
}

/**
 * 登录表单 · wx-backend §7.2 `POST /web/auth/login`
 *
 * **只有「邮箱 + 密码」一种方式。** 后端 web 端会员没有手机号账号，
 * 也没有验证码登录接口（短信那条线是小程序的，web 端 `verifyCode()` 全仓无调用方），
 * 所以不要再往回加验证码 tab。
 *
 * 校验只管「形状」（邮箱格式、密码非空），账号是否存在、密码是否正确一律交后端 ——
 * 后端对这两件事**故意返回同一句**「邮箱或密码错误」（§7.2，防账号枚举），
 * 前端也不要去猜。
 *
 * 登录凭证由 BFF 落 httpOnly Cookie，本组件不接触 token，见 `src/lib/auth-token.ts`。
 */
export function LoginForm({
  dict,
  redirectTo = "/",
  forgotHref = "/forgot-password",
  changePasswordHref = "/change-password",
}: LoginFormProps) {
  const router = useRouter();
  const copy = dict.login;
  const field = dict.fields;
  const msg = dict.errors;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) next.email = msg.emailRequired;
    else if (!EMAIL_RE.test(trimmedEmail)) next.email = msg.emailInvalid;

    if (!password) next.password = msg.passwordRequired;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await login(
        { email: email.trim(), password },
        msg.loginFailed,
      );
      router.replace(result?.mustChangePassword ? changePasswordHref : redirectTo);
      router.refresh();
    } catch (error) {
      setFormError(resolveAuthError(error, msg.loginFailed, msg.network));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AuthHeading title={copy.title} subtitle={copy.subtitle} />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field
          label={field.email}
          placeholder={field.emailPlaceholder}
          value={email}
          onValueChange={(value) => {
            setEmail(value);
            clearError("email");
          }}
          error={errors.email}
          inputMode="email"
          autoComplete="email"
          maxLength={254}
        />

        <Field
          label={field.password}
          placeholder={field.passwordPlaceholder}
          mode="password"
          value={password}
          onValueChange={(value) => {
            setPassword(value);
            clearError("password");
          }}
          error={errors.password}
          autoComplete="current-password"
          labelExtra={
            forgotHref ? (
              <Link
                href={forgotHref}
                className="text-sub font-semibold text-jade-700 transition-colors duration-[var(--t-fast)] hover:text-jade-800"
              >
                {copy.forgot}
              </Link>
            ) : null
          }
        />

        {formError && <AuthNotice tone="error">{formError}</AuthNotice>}

        <Button
          htmlType="submit"
          variant="primary"
          size="lg"
          block
          loading={submitting}
          disabled={submitting}
        >
          {submitting ? copy.submitting : copy.submit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sub text-ink-500">
        {copy.noAccount}{" "}
        <Link
          href="/register"
          className="font-semibold text-jade-700 transition-colors duration-[var(--t-fast)] hover:text-jade-800"
        >
          {copy.toRegister}
        </Link>
      </p>
    </>
  );
}
