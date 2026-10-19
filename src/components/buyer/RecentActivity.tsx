"use client";
import Link from "next/link";
import { useFoundation } from "../Providers";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import type { Page, Inquiry, Notification } from "@/src/lib/buyer/types";
import { BuyerStatus } from "./BuyerUI";
import styles from "./buyer.module.css";
interface Favorite {
  targetId: string;
  targetType: "enterprise" | "product";
  payload: { name: string } | null;
  favoritedAt: string;
}
export function RecentSaved() {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const products = useBuyer<Page<Favorite>>(
      `favorites?targetType=product&pageSize=2&locale=${locale}`,
    ),
    companies = useBuyer<Page<Favorite>>(
      `favorites?targetType=enterprise&pageSize=2&locale=${locale}`,
    );
  const rows = [
    ...(products.data?.items.filter((r) => r.targetType === "product") || []),
    ...(companies.data?.items.filter((r) => r.targetType === "enterprise") ||
      []),
  ]
    .sort((a, b) => Date.parse(b.favoritedAt) - Date.parse(a.favoritedAt))
    .slice(0, 3);
  return (
    <section className={styles.panel}>
      <div className={styles.row}>
        <h2>{t.recentSaved}</h2>
        <Link className={styles.link} href="/buyer/saved">
          {t.viewAll}
        </Link>
      </div>
      <BuyerStatus {...products} />
      <BuyerStatus {...companies} />
      {rows.map((row) => (
        <div className={styles.notice} key={row.targetId}>
          {row.payload ? (
            <Link
              className={styles.link}
              href={
                (row.targetType === "product" ? "/products/" : "/suppliers/") +
                row.targetId
              }
            >
              {row.payload.name}
            </Link>
          ) : (
            <p>{t.unavailable}</p>
          )}
        </div>
      ))}
      {!products.loading && !companies.loading && !rows.length && (
        <p>{t.empty}</p>
      )}
    </section>
  );
}
export function RecentMessages({ inquiries }: { inquiries: Inquiry[] }) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const notes = useBuyer<Page<Notification>>("notifications?pageSize=2");
  return (
    <section className={styles.panel}>
      <div className={styles.row}>
        <h2>{t.recentMessages}</h2>
        <Link className={styles.link} href="/buyer/messages">
          {t.viewAll}
        </Link>
      </div>
      <BuyerStatus {...notes} />
      {inquiries
        .filter((i) => i.unreadCount > 0)
        .slice(0, 2)
        .map((i) => (
          <div className={styles.notice} key={i.id}>
            <Link className={styles.link} href={"/buyer/inquiries/" + i.id}>
              {i.subject}
            </Link>
            <p>
              {i.enterpriseName} · {t.unread} {i.unreadCount}
            </p>
          </div>
        ))}
      {notes.data?.items.map((note) => (
        <div className={styles.notice} key={note.id}>
          <Link className={styles.link} href="/buyer/messages">
            {note.title}
          </Link>
          <p>{note.body}</p>
        </div>
      ))}
      {notes.data &&
        !notes.data.items.length &&
        !inquiries.some((i) => i.unreadCount > 0) && <p>{t.empty}</p>}
    </section>
  );
}
