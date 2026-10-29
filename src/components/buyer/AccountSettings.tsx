"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { AccountProfileForm } from "../auth/AccountProfileForm";
import { ChangePasswordForm } from "../auth/ChangePasswordForm";
import { useAuthTask } from "../auth/use-auth-task";
import { AuthError } from "../auth/AuthField";
import { GoogleSecurityMethods } from "../auth/GoogleSecurityMethods";
import { logout } from "@/src/lib/auth-api";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { useBuyerMember } from "./BuyerShell";
import { BuyerHead } from "./BuyerUI";
import styles from "./buyer.module.css";
export function AccountSettings({googleAvailable = false,reason}:{googleAvailable?:boolean;reason?:string}) {
  const member = useBuyerMember(),
    { locale } = useFoundation(),
    t = buyerCopy(locale),
    task = useAuthTask(),
    router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <BuyerHead title={t.security} intro={t.accountSettingsIntro} />
      {reason?.startsWith("google-") && <p role="status">{reason === "google-linked" ? task.t.googleLinked : reason === "google-cancelled" ? task.t.googleCancelled : task.t.googleInvalid}</p>}
      <section
        className={`${styles.panel} ${styles.accountIdentity}`}
        aria-label={task.t.accountTitle}
      >
        {member.avatarUrl ? (
          <Image
            unoptimized
            src={member.avatarUrl}
            width={56}
            height={56}
            alt=""
            className={styles.accountAvatar}
          />
        ) : (
          <span className={styles.accountAvatar} aria-hidden="true">
            {(member.nickname || member.email || "M").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <h2>{member.nickname || member.email}</h2>
          <p>{member.email}</p>
        </div>
        <span className={styles.tag}>
          {member.emailVerified ? task.t.verified : task.t.unverified}
        </span>
      </section>
      <div className={styles.settingsGrid}>
        <section className={styles.panel}>
          <AccountProfileForm
            member={member}
            embedded
            onSaved={() => router.refresh()}
          />
        </section>
        <section className={styles.panel}>
          {member.hasPassword ? (
            <ChangePasswordForm embedded />
          ) : (
            <>
              <h2>{task.t.changePassword}</h2>
              <p>{t.passwordNotAvailable}</p>
            </>
          )}
          <GoogleSecurityMethods key={member.id} member={member} googleAvailable={googleAvailable} />
          <div className={styles.signOutSection}>
            <h2>{task.t.signOut}</h2>
            <p>{t.signOutHint}</p>
            <Button
              variant="outline"
              onClick={() => setConfirm(true)}
              disabled={task.pending}
            >
              {task.t.signOut}
            </Button>
          </div>
        </section>
      </div>
      <Modal
        open={confirm}
        onClose={() => {
          if (!task.pending) setConfirm(false);
        }}
        title={task.t.signOut}
        footer={
          <>
            <Button
              variant="outline"
              disabled={task.pending}
              onClick={() => setConfirm(false)}
            >
              {t.cancel}
            </Button>
            <Button
              loading={task.pending}
              onClick={() =>
                void task.run(async () => {
                  await logout();
                  router.replace("/login?returnTo=%2Fbuyer%2Fsettings");
                  router.refresh();
                })
              }
            >
              {task.t.signOut}
            </Button>
          </>
        }
      >
        <p>{t.signOutHint}</p>
        <AuthError message={task.error} />
      </Modal>
    </>
  );
}
