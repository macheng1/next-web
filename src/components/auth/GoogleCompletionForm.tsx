"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checkbox } from "@douyinfe/semi-ui-19";
import {
  googlePending,
  googleSendCode,
  googleComplete,
  type GooglePending,
} from "@/src/lib/auth-api";
import { safeReturnTo } from "@/src/lib/auth/return-to";
import { googleCopy } from "@/src/lib/auth/google-copy";
import { useCatalog } from "@/src/lib/catalog/use-catalog";
import type { PublishedPolicies } from "@/src/lib/catalog/model";
import { Button } from "../Button";
import { AuthField, AuthError } from "./AuthField";
import { AuthPolicyLinks } from "./AuthShell";
import { useAuthTask } from "./use-auth-task";
import styles from "./auth.module.css";
export function GoogleCompletionForm() {
  const task = useAuthTask();
  const t = googleCopy(task.locale);
  const router = useRouter();
  const [pending, setPending] = useState<GooglePending | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [useCode, setUseCode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [accepted, setAccepted] = useState<string | null>(null);
  const policies = useCatalog<PublishedPolicies>("policies");
  const policyKey = policies.data?.version
    ? `${policies.data.version}:${task.locale}`
    : null;
  useEffect(() => {
    let active = true;
    googlePending()
      .then((data) => {
        if (active) {
          setPending(data);
          setNickname((data.nickname || "").slice(0, 32));
          setUseCode(!data.passwordAvailable);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  if (loadError)
    return (
      <>
        <h2>{t.completeTitle}</h2>
        <p role="alert">{task.t.googleInvalid}</p>
        <Link href="/login">{t.restart}</Link>
      </>
    );
  if (!pending) return <p role="status">{task.t.loading}</p>;
  const needsCode =
    pending.mode === "register" ? pending.requiresEmailVerification : useCode;
  const canComplete =
    pending.mode === "register"
      ? !!policyKey &&
        accepted === policyKey &&
        !policies.loading &&
        !policies.error
      : pending.passwordAvailable || pending.canSendCode;
  return (
    <>
      <h2>{t.completeTitle}</h2>
      <p className={styles.intro}>
        {pending.mode === "register" ? t.registerIntro : t.linkIntro}
      </p>
      <p>
        <strong>{pending.email}</strong>
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void task.run(async () => {
            if (!canComplete) {
              task.setError(task.t.agreeRequired);
              return;
            }
            const result = await googleComplete({
              pendingId: pending.pendingId,
              locale: task.locale,
              ...(pending.mode === "register"
                ? {
                    nickname,
                    acceptedTerms: true,
                    policyVersion: policies.data!.version,
                  }
                : {}),
              ...(needsCode
                ? { code }
                : pending.mode === "link"
                  ? { password }
                  : {}),
            });
            setPassword("");
            setCode("");
            router.replace(
              result.mustChangePassword
                ? "/account/password"
                : safeReturnTo(result.returnTo),
            );
            router.refresh();
          });
        }}
      >
        {pending.mode === "register" && (
          <>
            <AuthField
              id="google-nickname"
              label={t.nickname}
              value={nickname}
              maxLength={32}
              onChange={(e) => setNickname(e.target.value)}
              disabled={task.pending}
            />
            <div className={styles.agreement}>
              <Checkbox
                checked={!!policyKey && accepted === policyKey}
                onChange={(e) =>
                  setAccepted(e.target.checked ? policyKey : null)
                }
                disabled={task.pending || policies.loading || !!policies.error}
              >
                {task.t.agree}
              </Checkbox>
              <AuthPolicyLinks policies={policies.data} />
            </div>
            {policies.error && (
              <div role="alert">
                <p>{t.policyUnavailable}</p>
                <Button onClick={policies.retry}>{task.t.retry}</Button>
              </div>
            )}
          </>
        )}
        {pending.mode === "link" &&
          pending.passwordAvailable &&
          pending.canSendCode && (
            <Button
              variant="outline"
              htmlType="button"
              disabled={task.pending}
              onClick={() => {
                setUseCode(!useCode);
                setCode("");
                setPassword("");
              }}
            >
              {useCode ? t.usePassword : t.useCode}
            </Button>
          )}
        {pending.mode === "link" && !useCode && pending.passwordAvailable && (
          <AuthField
            id="google-password"
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
        {needsCode && (
          <>
            <AuthField
              id="google-code"
              label={task.t.code}
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={task.pending}
            />
            <Button
              variant="outline"
              htmlType="button"
              disabled={task.pending || seconds > 0 || !pending.canSendCode}
              onClick={() =>
                void task.run(async () => {
                  const result = await googleSendCode(
                    task.locale,
                    pending.pendingId,
                  );
                  setSeconds(result.retryAfter);
                })
              }
            >
              {t.sendCode}
              {seconds > 0 ? ` (${seconds}s)` : ""}
            </Button>
          </>
        )}
        {!canComplete && pending.mode === "link" && (
          <p role="alert">{t.noProof}</p>
        )}
        <Button
          block
          htmlType="submit"
          className={styles.primary}
          loading={task.pending}
          disabled={!canComplete}
        >
          {t.continue}
        </Button>
      </form>
      <AuthError message={task.error} />
      <p className={styles.switch}>
        <Link href="/login">{t.restart}</Link>
      </p>
    </>
  );
}
