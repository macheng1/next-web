"use client";
import { useCatalog } from "@/src/lib/catalog/use-catalog";
import type { PublishedPolicies } from "@/src/lib/catalog/model";
import { Checkbox } from "@douyinfe/semi-ui-19";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  register,
  sendRegistrationCode,
  verifyRegistrationEmail,
} from "@/src/lib/auth-api";
import { safeReturnTo } from "@/src/lib/auth/return-to";
import { Button } from "../Button";
import { AuthPolicyLinks } from "./AuthShell";
import { AuthField, AuthError } from "./AuthField";
import { useAuthTask } from "./use-auth-task";
import styles from "./auth.module.css";
export function RegisterForm({ returnTo = "/buyer" }: { returnTo?: string }) {
  const [step, setStep] = useState<"email" | "verify" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const policies = useCatalog<PublishedPolicies>("policies");
  const [acceptedPolicy, setAcceptedPolicy] = useState<string | null>(null);
  const [grant, setGrant] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [seconds, setSeconds] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const task = useAuthTask();
  const { t } = task;
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  useEffect(() => {
    if (step !== "email") heading.current?.focus();
  }, [step]);
  function back() {
    setGrant("");
    setCode("");
    setPassword("");
    setConfirm("");
    task.setError("");
    setStep("email");
  }
  const policyKey = policies.data?.version ? `${policies.data.version}:${task.locale}` : null;
  const accepted = policyKey !== null && acceptedPolicy === policyKey;
  async function send() {
    if (!accepted || !policies.data?.version || policies.loading || policies.error) { task.setError(t.agreeRequired); return; }
    const result = await sendRegistrationCode(email, task.locale, policies.data!.version);
    setSeconds(result.retryAfter);
    setCode("");
    setStep("verify");
  }
  return (
    <>
      {step !== "email" && (
        <button
          type="button"
          className={styles.back}
          disabled={task.pending}
          onClick={back}
        >
          {t.backRegister}
        </button>
      )}
      {step !== "email" && (
        <div className={styles.stepper}>
          {step === "verify" ? t.step1 : t.step2}
        </div>
      )}
      <h2 ref={heading} tabIndex={-1}>
        {step === "email"
          ? t.registerTitle
          : step === "verify"
            ? t.verifyTitle
            : t.setTitle}
      </h2>
      <p className={styles.intro}>
        {step === "email" ? (
          t.registerIntro
        ) : step === "verify" ? (
          <>
            {t.verifyIntro} <strong>{email.trim()}</strong>
          </>
        ) : (
          t.setIntro
        )}
      </p>
      {step === "email" && policies.error && <div role="alert"><p>{t.serviceUnavailable}</p><Button variant="outline" onClick={policies.retry}>{t.retry}</Button></div>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void task.run(async () => {
            if (step === "email") {
              if (!accepted) { task.setError(t.agreeRequired); return; }
              if (!policies.data?.version || policies.loading || policies.error) { task.setError(t.serviceUnavailable); return; }
              await send();
              return;
            }
            if (step === "verify") {
              const result = await verifyRegistrationEmail(email, code);
              setGrant(result.registrationToken);
              setStep("password");
              return;
            }
            if (password !== confirm) {
              task.setError(t.passwordMismatch);
              return;
            }
            await register({ registrationToken: grant, password });
            setPassword("");
            setConfirm("");
            setGrant("");
            router.replace(safeReturnTo(returnTo));
            router.refresh();
          });
        }}
      >
        {step === "email" && (
          <>
            <AuthField
              id="reg-email"
              label={t.email}
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              maxLength={128}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setGrant("");
              }}
              disabled={task.pending}
            />
            <div className={styles.agreement}>
              <Checkbox
                id="terms"
                aria-required
                checked={accepted}
                onChange={(e) => setAcceptedPolicy(e.target.checked ? policyKey : null)}
                disabled={task.pending || policies.loading || !!policies.error}
              >{t.agree}</Checkbox>
              <div><AuthPolicyLinks policies={policies.data} /></div>
            </div>
          </>
        )}
        {step === "verify" && (
          <AuthField
            id="code"
            label={t.code}
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={task.pending}
          />
        )}
        {step === "password" && (
          <>
            <AuthField
              id="new-password"
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
              id="confirm-password"
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
          {step === "email"
            ? t.continueEmail
            : step === "verify"
              ? t.verifyContinue
              : t.createAccount}
        </Button>
      </form>
      <AuthError message={task.error} />
      {step === "password" && task.error && (
        <p className={styles.hint}>{t.registrationRecovery}</p>
      )}
      {step === "verify" && (
        <div className={styles.hint}>
          {t.notReceived}{" "}
          <button
            type="button"
            className={styles.textButton}
            disabled={seconds > 0 || task.pending}
            onClick={() => void task.run(send)}
          >
            {t.resend}
            {seconds > 0 ? ` (${seconds}s)` : ""}
          </button>
        </div>
      )}
      {
        <p className={styles.switch}>
          {t.haveAccount}
          <Link
            href={`/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`}
          >
            {t.signIn}
          </Link>
        </p>
      }
    </>
  );
}
