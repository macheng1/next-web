"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WebMember } from "@/src/lib/server/session";
import { googleStatus, googleSecurity } from "@/src/lib/auth-api";
import { googleCopy } from "@/src/lib/auth/google-copy";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { AuthField, AuthError } from "./AuthField";
import { useAuthTask } from "./use-auth-task";
import styles from "./auth.module.css";
export function GoogleSecurityMethods({
  member,
  googleAvailable,
}: {
  member: WebMember;
  googleAvailable: boolean;
}) {
  const task = useAuthTask();
  const t = googleCopy(task.locale);
  const router = useRouter();
  const [status, setStatus] = useState<{
    bound: boolean;
    email: string | null;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [action, setAction] = useState<
    "link" | "unlink" | "set-password" | null
  >(null);
  const [useCode, setUseCode] = useState(!member.hasPassword);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    let active = true;
    googleStatus()
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [member.id]);
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  function open(value: typeof action) {
    setAction(value);
    setUseCode(!member.hasPassword || value === "set-password");
    setPassword("");
    setCode("");
    setNewPassword("");
    setConfirm("");
    setSeconds(0);
    task.setError("");
  }
  const canUnlink =
    member.hasPassword && member.emailVerified && !!member.email;
  const label =
    action === "link" ? t.bind : action === "unlink" ? t.unlink : t.setPassword;
  return (
    <>
      <h2>{t.methods}</h2>
      {failed ? (
        <p role="alert">{task.t.serviceUnavailable}</p>
      ) : !status ? (
        <p role="status">{task.t.loading}</p>
      ) : (
        <>
          <p>
            {status.bound ? t.bound : t.unbound}
            {status.email ? ` · ${status.email}` : ""}
          </p>
          {(status.bound || googleAvailable) && (
            <Button
              variant="outline"
              onClick={() => open(status.bound ? "unlink" : "link")}
              disabled={
                status.bound
                  ? !canUnlink
                  : !member.hasPassword && !member.emailVerified
              }
            >
              {status.bound ? t.unlink : t.bind}
            </Button>
          )}
          {!status.bound && !member.hasPassword && !member.emailVerified && (
            <p role="alert">{t.noProof}</p>
          )}
          {status.bound && !canUnlink && (
            <p className={styles.hint}>{t.lastMethod}</p>
          )}
          {!member.hasPassword && member.emailVerified && (
            <Button variant="outline" onClick={() => open("set-password")}>
              {t.setPassword}
            </Button>
          )}
        </>
      )}
      <Modal
        open={!!action}
        onClose={() => {
          if (!task.pending) open(null);
        }}
        title={label}
        footer={null}
      >
        <p>{action === "unlink" ? t.unlinkConfirm : t.proof}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void task.run(async () => {
              if (action === "set-password" && newPassword !== confirm) {
                task.setError(task.t.passwordMismatch);
                return;
              }
              if (!action) return;
              const proof = useCode ? { code } : { currentPassword: password };
              await googleSecurity(
                action === "link" ? "prepare" : action,
                member.id,
                action === "set-password" ? { code, newPassword } : proof,
              );
              setPassword("");
              setCode("");
              setNewPassword("");
              setConfirm("");
              if (action === "link") {
                const url = new URL(
                  "/api/auth/google/start",
                  window.location.origin,
                );
                url.search = new URLSearchParams({
                  intent: "link",
                  returnTo: "/buyer/settings",
                  locale: task.locale,
                }).toString();
                window.location.assign(url.toString());
              } else {
                router.replace(
                  `/login?reason=${action === "set-password" ? "password-updated" : "google-unlinked"}`,
                );
                router.refresh();
              }
            });
          }}
        >
          {action !== "set-password" &&
            member.hasPassword &&
            member.emailVerified && (
              <Button
                variant="outline"
                htmlType="button"
                disabled={task.pending}
                onClick={() => {
                  setUseCode(!useCode);
                  setPassword("");
                  setCode("");
                }}
              >
                {useCode ? t.usePassword : t.useCode}
              </Button>
            )}
          {useCode ? (
            <>
              <AuthField
                id="security-google-code"
                label={task.t.code}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={task.pending}
              />
              <Button
                variant="outline"
                htmlType="button"
                disabled={!member.emailVerified || task.pending || seconds > 0}
                onClick={() =>
                  void task.run(async () => {
                    if (action) {
                      const result = await googleSecurity(
                        "security-code",
                        member.id,
                        { purpose: action, locale: task.locale },
                      );
                      setSeconds(result.retryAfter || 60);
                    }
                  })
                }
              >
                {t.sendCode}
                {seconds > 0 ? ` (${seconds}s)` : ""}
              </Button>
            </>
          ) : (
            <AuthField
              id="security-google-password"
              label={task.t.currentPassword}
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={task.pending}
            />
          )}
          {action === "set-password" && (
            <>
              <AuthField
                id="security-new-password"
                label={task.t.password}
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={task.pending}
              />
              <AuthField
                id="security-confirm-password"
                label={task.t.confirm}
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={task.pending}
              />
            </>
          )}
          <AuthError message={task.error} />
          <div className={styles.actions}>
            <Button
              variant="outline"
              htmlType="button"
              disabled={task.pending}
              onClick={() => open(null)}
            >
              {t.cancelled}
            </Button>
            <Button htmlType="submit" loading={task.pending}>
              {action === "link" ? t.bind : t.done}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
