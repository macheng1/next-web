"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestPasswordReset, resetPassword } from "@/src/lib/auth-api";
import { HttpError } from "@/src/lib/http/types";
import { Button } from "../Button";
import { AuthField, AuthError } from "./AuthField";
import { useAuthTask } from "./use-auth-task";
import styles from "./auth.module.css";
export function PasswordResetForm({ token }: { token?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [expired, setExpired] = useState(
    token !== undefined && !/^[A-Za-z0-9_-]{43}$/.test(token),
  );
  const router = useRouter();
  const task = useAuthTask();
  const { t } = task;
  if (expired)
    return (
      <>
        <div className={styles.statusIcon}>!</div>
        <h2>{t.expiredTitle}</h2>
        <p className={styles.intro}>{t.expiredIntro}</p>
        <Link
          href="/forgot-password"
          className={`${styles.primary} ${styles.actionLink}`}
        >
          {t.requestNew}
        </Link>
        <p className={styles.switch}>
          <Link href="/login">{t.backLogin}</Link>
        </p>
      </>
    );
  if (sent)
    return (
      <>
        <div className={styles.statusIcon}>↗</div>
        <h2>{t.sentTitle}</h2>
        <p className={styles.intro}>{t.sentIntro}</p>
        <div className={styles.emailPreview}>
          {t.sentEmail} <strong>{email}</strong>
        </div>
        <Button
          block
          variant="secondary"
          radius={8}
          className={styles.secondary}
          onClick={() => setSent(false)}
        >
          {t.changeEmail}
        </Button>
        <p className={styles.switch}>
          <Link href="/login">{t.backLogin}</Link>
        </p>
      </>
    );
  return (
    <>
      {token === undefined && (
        <Link href="/login" className={styles.back}>
          {t.backLogin}
        </Link>
      )}
      <h2>{token === undefined ? t.forgotTitle : t.newPasswordTitle}</h2>
      <p className={styles.intro}>
        {token === undefined ? t.forgotIntro : t.resetIntro}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void task.run(async () => {
            if (token === undefined) {
              await requestPasswordReset(email, task.locale);
              setSent(true);
              return;
            }
            if (password !== confirm) {
              task.setError(t.passwordMismatch);
              return;
            }
            try {
              await resetPassword({ token, newPassword: password });
            } catch (error) {
              if (
                error instanceof HttpError &&
                error.errorKey === "reset_invalid"
              )
                setExpired(true);
              throw error;
            }
            setPassword("");
            setConfirm("");
            router.replace("/login?reason=password-updated");
            router.refresh();
          });
        }}
      >
        {token === undefined ? (
          <AuthField
            id="reset-email"
            label={t.email}
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            maxLength={128}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={task.pending}
          />
        ) : (
          <>
            <AuthField
              id="reset-password"
              label={t.password}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              placeholder={t.newPasswordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={task.pending}
            />
            <AuthField
              id="reset-confirm"
              label={t.confirm}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              placeholder={t.confirmPlaceholder}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={task.pending}
            />
          </>
        )}
        <Button
          block
          size="lg"
          radius={8}
          htmlType="submit"
          loading={task.pending}
          className={styles.primary}
        >
          {token === undefined ? t.resetButton : t.resetSave}
        </Button>
      </form>
      <AuthError message={task.error} />
      {token !== undefined && (
        <p className={styles.switch}>
          <Link href="/forgot-password">{t.requestNew}</Link> ·{" "}
          <Link href="/login">{t.signIn}</Link>
        </p>
      )}
    </>
  );
}
