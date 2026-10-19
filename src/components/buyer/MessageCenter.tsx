"use client";
import { useState } from "react";
import Link from "next/link";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import { buyerApi } from "@/src/lib/buyer/api";
import type { Page, Inquiry, Notification } from "@/src/lib/buyer/types";
import { BuyerHead, BuyerStatus, BuyerEmpty, BuyerPagination } from "./BuyerUI";
import { useBuyerMember } from "./BuyerShell";
import { InquiryRows } from "./InquiryList";
import styles from "./buyer.module.css";
function InquiryMessages() {
  const [page, setPage] = useState(1);
  const data = useBuyer<Page<Inquiry>>("inquiries?page=" + page);
  return (
    <>
      <BuyerStatus {...data} />
      {data.data && (
        <section className={styles.panel}>
          <InquiryRows items={data.data.items} />
          <BuyerPagination
            page={page}
            total={data.data.total}
            setPage={setPage}
          />
        </section>
      )}
    </>
  );
}
function SystemMessages() {
  const member = useBuyerMember();
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const data = useBuyer<Page<Notification>>("notifications?page=" + page);
  async function read(ids: string[]) {
    if (busy) return;
    setBusy(true);
    try {
      await buyerApi.write(
        "notifications/read-all",
        { ids },
        undefined,
        "PUT",
        member.id,
      );
      data.retry();
      window.dispatchEvent(new Event("buyer-data"));
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className={styles.actions}>
        <Button
          variant="outline"
          disabled={busy || !data.data?.items.some((n) => !n.read)}
          onClick={() =>
            void read(data.data!.items.filter((n) => !n.read).map((n) => n.id))
          }
        >
          {t.markVisibleRead}
        </Button>
      </div>
      <BuyerStatus {...data} />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {data.data && !data.data.items.length && <BuyerEmpty />}
      {data.data?.items.map((n) => (
        <section className={styles.panel} key={n.id}>
          <div className={styles.row}>
            <h2>{n.title}</h2>
            <span className={styles.tag}>{n.read ? t.read : t.unread}</span>
          </div>
          <p>{n.body}</p>
          <div className={styles.actions}>
            <small>
              {new Date(n.createdAt).toLocaleString(
                locale === "en" ? "en-GB" : "zh-CN",
              )}
            </small>
            {!n.read && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void read([n.id])}
              >
                {t.markRead}
              </Button>
            )}
            {n.relatedType === "enterprise_profile" && (
              <Link className={styles.link} href="/buyer/settings">
                {t.security}
              </Link>
            )}
          </div>
        </section>
      ))}
      {data.data && (
        <BuyerPagination
          page={page}
          total={data.data.total}
          setPage={setPage}
        />
      )}
    </>
  );
}
export function MessageCenter() {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const [type, setType] = useState("chat");
  return (
    <>
      <BuyerHead title={t.messages} intro={t.messagesIntro} />
      <div className={styles.toolbar}>
        <Button
          variant={type === "chat" ? "secondary" : "outline"}
          onClick={() => setType("chat")}
        >
          {t.chatMessages}
        </Button>
        <Button
          variant={type === "system" ? "secondary" : "outline"}
          onClick={() => setType("system")}
        >
          {t.systemNotifications}
        </Button>
      </div>
      {type === "chat" ? <InquiryMessages /> : <SystemMessages />}
    </>
  );
}
