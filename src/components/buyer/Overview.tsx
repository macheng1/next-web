"use client";
import Link from "next/link";
import { useFoundation } from "../Providers";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import type { Summary, Page, Inquiry } from "@/src/lib/buyer/types";
import { BuyerHead, BuyerStatus } from "./BuyerUI";
import { useBuyerMember } from "./BuyerShell";
import { InquiryRows } from "./InquiryList";
import { RecentSaved, RecentMessages } from "./RecentActivity";
import styles from "./buyer.module.css";
export function Overview() {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    member = useBuyerMember();
  const summary = useBuyer<Summary>("summary"),
    recent = useBuyer<Page<Inquiry>>("inquiries?pageSize=3");
  return (
    <>
      <BuyerHead title={t.overview} />
      <div className={styles.welcome}>
        <h2>
          {t.overviewWelcome}，{member.nickname || member.email}
        </h2>
        <p>{t.welcomeText}</p>
      </div>
      <BuyerStatus {...summary} />
      {summary.data && (
        <div className={styles.metrics}>
          {[
            [t.awaiting, summary.data.pendingInquiries, "/buyer/inquiries"],
            [
              t.unread,
              summary.data.unreadMessages + summary.data.unreadNotifications,
              "/buyer/messages",
            ],
            [
              t.savedLabel,
              summary.data.savedProducts + summary.data.savedEnterprises,
              "/buyer/saved",
            ],
          ].map(([label, count, href]) => (
            <Link
              href={String(href)}
              key={String(href)}
              className={styles.metric}
            >
              {label}
              <b>{count}</b>
            </Link>
          ))}
        </div>
      )}
      <section className={styles.panel}>
        <div className={styles.row}>
          <h2>{t.recent}</h2>
          <Link href="/buyer/inquiries" className={styles.link}>
            {t.viewAll}
          </Link>
        </div>
        <BuyerStatus {...recent} />
        {recent.data && <InquiryRows items={recent.data.items} />}
      </section>
      <div className={styles.grid}>
        <RecentSaved />
        <RecentMessages inquiries={recent.data?.items || []} />
      </div>
    </>
  );
}
