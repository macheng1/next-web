"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Dictionary } from "@/src/dictionaries";
import { Button } from "@/src/components/Button";
import { Field } from "@/src/components/Field";
import { AuthHeading, AuthNotice } from "@/src/components/AuthShell/parts";
import { requestPasswordReset, resolveAuthError } from "@/src/lib/auth-api";

type AuthDict = Dictionary["auth"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ForgotPasswordFormProps {
  dict: AuthDict;
  loginHref?: string;
}

/**
 * 忘记密码 · wx-backend §7.3 `POST /web/auth/forgot-password`
 *
 * 这条流程是**纯邮件**的，与「手机号 + 短信验证码 + 当场设新密码」完全不同：
 * 提交邮箱 → 后端发一封含一次性链接的邮件 → 用户点开 `/reset-password?token=xxx`
 * 才设新密码。所以**这个页面只负责把邮件请出去**，不收集新密码。
 *
 * 后端**永远返回同一句话**（邮箱没注册也一样，§7.3，防账号枚举），
 * 因此这里不存在「邮箱不存在」这种提示 —— 成功态直接就是「请查收邮件」。
 * 也正因为如此，请求失败只可能是网络 / 限流 / 服务端问题，不会是「查无此邮箱」。
 */
export function ForgotPasswordForm({
  dict,
  loginHref = "/login",
}: ForgotPasswordFormProps) {
  const router = useRouter();
  const copy = dict.forgot;
  const field = dict.fields;
  const msg = dict.errors;

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** 已提交的邮箱；非空即切到「请查收邮件」结果态 */
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(msg.emailRequired);
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError(msg.emailInvalid);
      return;
    }
    setError(undefined);

    setSubmitting(true);
    try {
      await requestPasswordReset(trimmedEmail, msg.forgotFailed);
      setSentTo(trimmedEmail);
    } catch (error) {
      setFormError(resolveAuthError(error, msg.forgotFailed, msg.network));
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <>
        <AuthHeading title={copy.doneTitle} />
        <AuthNotice tone="success">{copy.doneBody}</AuthNotice>

        <p className="mt-5 text-body text-ink-600">
          {copy.doneAccount}
          <span className="font-semibold break-all text-ink-900">{sentTo}</span>
          {copy.doneAfter}
        </p>
        <p className="mt-2 text-cap text-ink-500">{copy.doneHint}</p>

        <div className="mt-7 flex flex-col gap-3">
          <Button
            htmlType="button"
            variant="primary"
            size="lg"
            block
            onClick={() => router.push(loginHref)}
          >
            {copy.back}
          </Button>
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setFormError(null);
            }}
            className="mx-auto text-sub font-semibold text-jade-700 transition-colors duration-[var(--t-fast)] hover:text-jade-800"
          >
            {copy.resendOther}
          </button>
        </div>
      </>
    );
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
            setError(undefined);
          }}
          error={error}
          autoFocus
          inputMode="email"
          autoComplete="email"
          maxLength={254}
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
        <Link
          href={loginHref}
          className="font-semibold text-jade-700 transition-colors duration-[var(--t-fast)] hover:text-jade-800"
        >
          {copy.back}
        </Link>
      </p>
    </>
  );
}
