"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Dictionary } from "@/src/dictionaries";
import { Button } from "@/src/components/Button";
import { Field } from "@/src/components/Field";
import { AuthHeading, AuthNotice } from "@/src/components/AuthShell/parts";
import { AuthError, changePassword, resolveAuthError } from "@/src/lib/auth-api";
import { isStrongPassword } from "@/src/lib/password";

type AuthDict = Dictionary["auth"];

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface ChangePasswordFormProps {
  dict: AuthDict;
  loginHref?: string;
}

/**
 * 改密 / 强制改密 · wx-backend §7.10 `POST /web/members/me/change-password`
 *
 * 何时会走到这一页：
 * 1. **首次登录强制改密** —— 审核通过时后台生成初始密码并邮件下发，
 *    同时置 `mustChangePassword=true`。此状态下除本接口与
 *    `GET /web/members/me/enterprise-status` 外，**其余接口一律 403**（§7.0），
 *    所以登录后必须先把人送到这里，否则他进去也是满屏报错。
 * 2. 用户主动改密（会员中心里另有人口，同一接口）。
 *
 * ⚠️ **改密成功 = 当场掉线**：后端 `tokenVersion++`，旧 token 立刻失效（§1.6）。
 * 所以成功态唯一的去处是登录页，不存在「改完接着用」。
 * BFF 也在这时候主动清掉了 httpOnly Cookie（见那边 route.ts 的说明）。
 */
export function ChangePasswordForm({
  dict,
  loginHref = "/login",
}: ChangePasswordFormProps) {
  const router = useRouter();
  const copy = dict.change;
  const field = dict.fields;
  const msg = dict.errors;

  const [currentPassword, setCurrentPassword] = useState("");
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

    if (!currentPassword) next.currentPassword = msg.currentPasswordRequired;

    if (!newPassword) next.newPassword = msg.passwordRequired;
    else if (!isStrongPassword(newPassword)) next.newPassword = msg.passwordWeak;
    else if (newPassword === currentPassword) next.newPassword = msg.passwordUnchanged;

    if (!confirmPassword) next.confirmPassword = msg.confirmRequired;
    else if (confirmPassword !== newPassword) next.confirmPassword = msg.confirmMismatch;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword }, msg.changeFailed);
      setDone(true);
    } catch (error) {
      // 401 = 登录态已经失效（被禁用 / 换过密码 / 过期），引导重新登录而不是让人反复重试
      if (error instanceof AuthError && error.httpStatus === 401) {
        setFormError(msg.sessionExpired);
        return;
      }
      setFormError(resolveAuthError(error, msg.changeFailed, msg.network));
    } finally {
      setSubmitting(false);
    }
  }

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
          label={field.currentPassword}
          placeholder={field.currentPasswordPlaceholder}
          mode="password"
          value={currentPassword}
          onValueChange={(value) => {
            setCurrentPassword(value);
            clearError("currentPassword");
          }}
          error={errors.currentPassword}
          autoFocus
          autoComplete="current-password"
        />

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
