"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Dictionary } from "@/src/dictionaries";
import { Button } from "@/src/components/Button";
import { Field } from "@/src/components/Field";
import { AuthHeading, AuthNotice } from "@/src/components/AuthShell/parts";
import { resetPassword, resolveAuthError } from "@/src/lib/auth-api";
import { isStrongPassword } from "@/src/lib/password";

type AuthDict = Dictionary["auth"];

interface FieldErrors {
  newPassword?: string;
  confirmPassword?: string;
}

export interface ResetPasswordFormProps {
  dict: AuthDict;
  /** 邮件链接里的 token；缺失（用户直接敲了 `/reset-password`）时为 null */
  token: string | null;
  loginHref?: string;
  forgotHref?: string;
}

/**
 * 用邮件链接重置密码 · wx-backend §7.4 `POST /web/auth/reset-password`
 *
 * 进入方式只有一个：用户点开忘记密码邮件里的 `…/reset-password?token=xxx`。
 * 在本项目里这一页属于认证路由组，所以要**自己从 query 里取 token** 再传给组件。
 *
 * 两种失败态要分开：
 * - **没有 token**（直接访问 URL / 邮件客户端把链接截断了）→ 本地就能判断，给「链接无效」态；
 * - **token 无效 / 过期 / 已用过**（后端 §7.4 返回 10003）→ 只有提交后才知道，
 *   这时后端原文已经说清原因，直接展示即可。
 *
 * 成功后该会员**两端的所有旧 token 立即失效**（§1.6 `tokenVersion++`），
 * 所以结果态引导回登录页，而不是自动登录。
 */
export function ResetPasswordForm({
  dict,
  token,
  loginHref = "/login",
  forgotHref = "/forgot-password",
}: ResetPasswordFormProps) {
  const router = useRouter();
  const copy = dict.reset;
  const field = dict.fields;
  const msg = dict.errors;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!newPassword) next.newPassword = msg.passwordRequired;
    else if (!isStrongPassword(newPassword)) next.newPassword = msg.passwordWeak;

    if (!confirmPassword) next.confirmPassword = msg.confirmRequired;
    else if (confirmPassword !== newPassword) next.confirmPassword = msg.confirmMismatch;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate() || !token) return;

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword }, msg.resetFailed);
      setDone(true);
    } catch (error) {
      setFormError(resolveAuthError(error, msg.resetFailed, msg.network));
    } finally {
      setSubmitting(false);
    }
  }

  // ── 链接里没有 token ──
  if (!token) {
    return (
      <>
        <AuthHeading title={copy.invalidTitle} />
        <AuthNotice tone="error">{copy.invalidBody}</AuthNotice>
        <Button
          htmlType="button"
          variant="primary"
          size="lg"
          block
          className="mt-7"
          onClick={() => router.push(forgotHref)}
        >
          {copy.invalidAction}
        </Button>
      </>
    );
  }

  // ── 重置成功 ──
  if (done) {
    return (
      <>
        <AuthHeading title={copy.doneTitle} />
        <AuthNotice tone="success">{copy.doneBody}</AuthNotice>
        <Button
          htmlType="button"
          variant="primary"
          size="lg"
          block
          className="mt-7"
          onClick={() => router.push(loginHref)}
        >
          {copy.doneAction}
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeading title={copy.title} subtitle={copy.subtitle} />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field
          label={field.newPassword}
          placeholder={field.newPasswordPlaceholder}
          mode="password"
          value={newPassword}
          onValueChange={(value) => {
            setNewPassword(value);
            clearError("newPassword");
          }}
          error={errors.newPassword}
          hint={field.newPasswordHint}
          autoFocus
          autoComplete="new-password"
        />

        <Field
          label={field.confirmPassword}
          placeholder={field.confirmPasswordPlaceholder}
          mode="password"
          value={confirmPassword}
          onValueChange={(value) => {
            setConfirmPassword(value);
            clearError("confirmPassword");
          }}
          error={errors.confirmPassword}
          autoComplete="new-password"
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
    </>
  );
}
