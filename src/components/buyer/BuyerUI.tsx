"use client";
import Link from "next/link";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { HttpError } from "@/src/lib/http/types";
import { safeReturnTo } from "@/src/lib/auth/return-to";
import styles from "./buyer.module.css";
export function BuyerHead({
  title,
  intro,
  action,
}: {
  title: string;
  intro?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.head}>
      <div>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {action}
    </div>
  );
}
export function BuyerStatus({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: Error;
  retry: () => void;
}) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const expired =
    error instanceof HttpError &&
    (error.status === 401 || error.bizCode === 40001);
  if (loading)
    return (
      <div role="status" aria-live="polite" className={styles.panel}>
        <p>{t.loading}</p>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  if (error)
    return (
      <div role="alert" className={styles.error}>
        <p>{expired ? t.sessionExpired : t.loadFailed}</p>
        {expired ? (
          <Link
            className={styles.link}
            href={
              "/login?returnTo=" +
              encodeURIComponent(
                typeof window !== "undefined"
                  ? safeReturnTo(
                      window.location.pathname + window.location.search,
                    )
                  : "/buyer",
              )
            }
          >
            {t.login}
          </Link>
        ) : (
          <Button variant="outline" onClick={retry}>
            {t.retry}
          </Button>
        )}
      </div>
    );
  return null;
}
export function BuyerEmpty() {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  return (
    <div className={`${styles.panel} ${styles.empty}`}>
      <h2>{t.empty}</h2>
      <Link className={styles.link} href="/products">
        {t.browseProducts} →
      </Link>
    </div>
  );
}
export function BuyerPagination({
  page,
  total,
  pageSize = 20,
  setPage,
}: {
  page: number;
  total: number;
  pageSize?: number;
  setPage: (n: number) => void;
}) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  return total > pageSize ? (
    <div className={styles.pagination}>
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        {t.previous}
      </Button>
      <span>
        {page} / {Math.ceil(total / pageSize)}
      </span>
      <Button
        variant="outline"
        disabled={page * pageSize >= total}
        onClick={() => setPage(page + 1)}
      >
        {t.next}
      </Button>
    </div>
  ) : null;
}
export function BuyerSessionGate() {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  useEffect(() => {
    window.location.replace(
      "/login?returnTo=" +
        encodeURIComponent(
          safeReturnTo(window.location.pathname + window.location.search),
        ),
    );
  }, []);
  return <p role="status">{t.sessionExpired}</p>;
}
