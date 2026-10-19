"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { changePassword } from "@/src/lib/auth-api";
import { Button } from "../Button";
import { AuthField, AuthError } from "./AuthField";
import { useAuthTask } from "./use-auth-task";
import styles from "./auth.module.css";
export function ChangePasswordForm({
  forced = false,
  embedded = false,
}: {
  forced?: boolean;
  embedded?: boolean;
}) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const task = useAuthTask();
  const { t } = task;
  const router = useRouter();
  return (
    <>
      {!forced && !embedded && (
        <Link href="/account" className={styles.back}>
          {t.backAccount}
        </Link>
      )}
      <h2>{t.changePassword}</h2>
      <p className={styles.intro}>{t.changeIntro}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void task.run(async () => {
            if (password !== confirm) {
              task.setError(t.passwordMismatch);
              return;
            }
            await changePassword({
              currentPassword: current,
              newPassword: password,
            });
            setCurrent("");
            setPassword("");
            setConfirm("");
            router.replace(
              embedded
                ? "/login?reason=password-updated&returnTo=%2Fbuyer%2Fsettings"
                : "/login?reason=password-updated",
            );
            router.refresh();
          });
        }}
      >
        <AuthField
          id="current-password"
          label={t.currentPassword}
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          disabled={task.pending}
        />
        <AuthField
          id="change-password"
          label={t.password}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={task.pending}
        />
        <AuthField
          id="change-confirm"
          label={t.confirm}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
          {t.resetSave}
        </Button>
      </form>
      <AuthError message={task.error} />
    </>
  );
}
