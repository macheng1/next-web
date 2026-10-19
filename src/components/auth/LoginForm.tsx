"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/src/lib/auth-api";
import { safeReturnTo } from "@/src/lib/auth/return-to";
import { Button } from "../Button";
import { AuthField, AuthError } from "./AuthField";
import { useAuthTask } from "./use-auth-task";
import styles from "./auth.module.css";
export function LoginForm({
  returnTo = "/buyer",
  reason,
}: {
  returnTo?: string;
  reason?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const task = useAuthTask();
  const { t } = task;
  return (
    <>
      <h2>{t.loginTitle}</h2>
      <p className={styles.intro}>
        {reason === "expired" ? t.sessionIntro : t.loginIntro}
      </p>
      {reason === "password-updated" && (
        <p role="status" className={styles.notice}>
          {t.resetDone}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void task.run(async () => {
            const result = await login({ email, password });
            setPassword("");
            router.replace(
              result.mustChangePassword
                ? "/account/password"
                : safeReturnTo(returnTo),
            );
            router.refresh();
          });
        }}
      >
        <AuthField
          id="email"
          label={t.email}
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          required
          maxLength={128}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={task.pending}
        />
        <AuthField
          id="password"
          label={t.password}
          aside={<Link href="/forgot-password">{t.forgotLink}</Link>}
          type="password"
          autoComplete="current-password"
          placeholder={t.passwordPlaceholder}
          required
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={task.pending}
        />
        <Button
          block
          size="lg"
          radius={8}
          htmlType="submit"
          loading={task.pending}
          className={styles.primary}
        >
          {t.signIn}
        </Button>
      </form>
      <AuthError message={task.error} />
      <p className={styles.switch}>
        {t.noAccount}
        <Link
          href={`/register?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`}
        >
          {t.createAccount}
        </Link>
      </p>
    </>
  );
}
