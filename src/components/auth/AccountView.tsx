"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { WebMember } from "@/src/lib/server/session";
import { GoogleSecurityMethods } from "./GoogleSecurityMethods";
import { logout } from "@/src/lib/auth-api";
import { Button } from "../Button";
import { AuthError } from "./AuthField";
import { useAuthTask } from "./use-auth-task";
import styles from "./auth.module.css";
export function AccountView({ member, googleAvailable = false }: { member: WebMember; googleAvailable?:boolean }) {
  const task = useAuthTask();
  const { t } = task;
  const router = useRouter();
  return (
    <>
      <div className={styles.statusIcon}>✓</div>
      <h2>{t.accountTitle}</h2>
      <Link href="/buyer" className="text-jade-700">{task.locale === "en" ? "Buyer workspace →" : "返回买家工作台 →"}</Link>
      <p className={styles.intro}>{t.accountIntro}</p>
      <div className={styles.identity}>
        {member.avatarUrl ? (
          <Image
            unoptimized
            width={39}
            height={39}
            src={member.avatarUrl}
            alt=""
            className={styles.avatar}
          />
        ) : (
          <span className={styles.avatar}>
            {(member.nickname || member.email || "M").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <strong>{member.nickname || member.email}</strong>
          <small>{member.email}</small>
        </div>
      </div>
      <div className={styles.kv}>
        <span>{t.accountType}</span>
        <span className={styles.tag}>
          {member.memberType === "enterprise" ? t.enterpriseMember : t.personal}
        </span>
      </div>
      <div className={styles.kv}>
        <span>{t.methods}</span>
        <span>{t.email}</span>
      </div>
      <div className={styles.kv}>
        <span>{t.email}</span>
        <span className={styles.tag}>
          {member.emailVerified ? t.verified : t.unverified}
        </span>
      </div>
      <GoogleSecurityMethods key={member.id} member={member} googleAvailable={googleAvailable} />
      <div className={styles.actions}>

        <Link
          className={`${styles.secondary} ${styles.actionLink}`}
          href="/account/profile"
        >
          {t.editProfile}
        </Link>
        {member.hasPassword && (
          <Link
            className={`${styles.secondary} ${styles.actionLink}`}
            href="/account/password"
          >
            {t.changePassword}
          </Link>
        )}
        <Button
          block
          radius={8}
          variant="secondary"
          className={styles.secondary}
          loading={task.pending}
          onClick={() =>
            void task.run(async () => {
              await logout();
              router.replace("/login");
              router.refresh();
            })
          }
        >
          {t.signOut}
        </Button>
      </div>
      <AuthError message={task.error} />
    </>
  );
}
export function AuthUnavailable() {
  const task = useAuthTask();
  const router = useRouter();
  return (
    <>
      <h2>{task.t.accountTitle}</h2>
      <p role="alert" className={styles.intro}>
        {task.t.serviceUnavailable}
      </p>
      <Button
        block
        size="lg"
        className={styles.primary}
        onClick={() => router.refresh()}
      >
        {task.t.retry}
      </Button>
    </>
  );
}
