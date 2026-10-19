"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WebMember } from "@/src/lib/server/session";
import { useFoundation } from "../Providers";
import { BrandLogo } from "../catalog/BrandLogo";
import { LanguageSelect } from "../catalog/LanguageSelect";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { claimGuest, listGroups } from "@/src/lib/buyer/draft-storage";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import type { Summary } from "@/src/lib/buyer/types";
import {
  SESSION_EVENT,
  SESSION_STORAGE_KEY,
} from "@/src/lib/auth/session-events";
import { checkSession } from "@/src/lib/auth-api";
import { Button } from "../Button";
import styles from "./buyer.module.css";
const MemberContext = createContext<WebMember | null>(null);
export function useBuyerMember() {
  const member = useContext(MemberContext);
  if (!member) throw Error("Buyer member context missing");
  return member;
}
export function BuyerShell({
  member,
  children,
}: {
  member: WebMember;
  children: ReactNode;
}) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    path = usePathname();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState("");
  const [migrationError, setMigrationError] = useState(false);
  const summary = useBuyer<Summary>("summary");
  const refreshSummary = summary.retry;
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      try {
        claimGuest(member.id);
      } catch {
        if (active) setMigrationError(true);
      }
      if (active) setReady(member.id);
    });
    const identityChanged = () => {
      void checkSession()
        .then((session) => {
          if (
            active &&
            (session.status !== "authenticated" ||
              session.member.id !== member.id)
          )
            window.location.reload();
        })
        .catch(() => {});
    };
    const identityStorage = (event: StorageEvent) => {
      if (event.key === SESSION_STORAGE_KEY) identityChanged();
    };
    window.addEventListener(SESSION_EVENT, identityChanged);
    window.addEventListener("storage", identityStorage);
    window.addEventListener("focus", identityChanged);
    const sync = () =>
      setCount(
        Object.values(listGroups(member.id)).reduce(
          (n, rows) => n + rows.length,
          0,
        ),
      );
    sync();
    const changed = () => {
      sync();
      refreshSummary();
    };
    window.addEventListener("buyer-data", changed);
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener(SESSION_EVENT, identityChanged);
      window.removeEventListener("storage", identityStorage);
      window.removeEventListener("focus", identityChanged);
      window.removeEventListener("buyer-data", changed);
      window.removeEventListener("storage", sync);
    };
  }, [member.id, refreshSummary]);
  const links = [
    ["/buyer", t.overview],
    ["/buyer/inquiries", t.inquiries],
    ["/buyer/list", t.list],
    ["/buyer/saved", t.saved],
    ["/buyer/messages", t.messages],
    ["/buyer/settings", t.security],
  ];
  const unread =
    (summary.data?.unreadMessages || 0) +
    (summary.data?.unreadNotifications || 0);
  return (
    <MemberContext.Provider value={member}>
      <div className={styles.root}>
        <header className={styles.top}>
          <Link href="/" className={styles.brand}>
            <BrandLogo />
          </Link>
          <Link href="/products" className={styles.browse}>
            {t.browse}
          </Link>
          <div className={styles.right}>
            <LanguageSelect compact />
            <Link href="/buyer/messages" aria-label={t.messages}>
              <span className={styles.messageLabel}>{t.messages}</span>
              <svg
                className={styles.bell}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3zM10 21h4" />
              </svg>
              {unread > 0 ? ` (${unread})` : ""}
            </Link>
            <Button
              variant="ghost"
              className={styles.mobileMenu}
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={t.workspaceTitle}
            >
              ☰
            </Button>
          </div>
        </header>
        <div className={styles.layout}>
          <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
            <div className={styles.caption}>{t.workspace}</div>
            <nav className={styles.nav}>
              {links.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={
                    (href === "/buyer" ? path === href : path?.startsWith(href))
                      ? "page"
                      : undefined
                  }
                >
                  {label}
                  {href === "/buyer/list" && count > 0 ? (
                    <span>{count}</span>
                  ) : href === "/buyer/messages" && unread > 0 ? (
                    <span>{unread}</span>
                  ) : null}
                </Link>
              ))}
            </nav>
            <div className={styles.person}>
              <strong>{member.nickname || member.email}</strong>
              <small>{member.email}</small>
            </div>
          </aside>
          <main className={styles.main}>
            {ready === member.id ? (
              <>
                {migrationError && (
                  <p role="alert" className={styles.error}>
                    {t.invalid} {t.localNotice}
                  </p>
                )}
                {children}
              </>
            ) : (
              <p role="status">{t.loading}</p>
            )}
          </main>
        </div>
      </div>
    </MemberContext.Provider>
  );
}
