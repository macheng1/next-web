"use client";
import { Field } from "../Field";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { buyerError } from "@/src/lib/buyer/errors";
import { buyerCopy, inquiryStatus, productLabels } from "@/src/lib/buyer/copy";
import { buyerApi } from "@/src/lib/buyer/api";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import { mergeMessages, money, readKnownReceipts } from "@/src/lib/buyer/chat";
import {
  ReadPositionQueue,
  visibleMessagePosition,
} from "@/src/lib/buyer/read-position";
import { saveIndependentForm } from "@/src/lib/buyer/draft-storage";
import type { Inquiry, Message, Attachment } from "@/src/lib/buyer/types";
import { BuyerHead, BuyerStatus } from "./BuyerUI";
import { useBuyerMember } from "./BuyerShell";
import { MessageComposer } from "./MessageComposer";
import { QuoteHistory } from "./QuoteHistory";
import styles from "./buyer.module.css";
interface MessagePage {
  items: Message[];
  hasMoreBefore: boolean;
  readThroughSequence: number;
  nextAfterSequence: number;
}
export function FileLink({ file }: { file: Attachment }) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const [error, setError] = useState("");
  async function open() {
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;
    try {
      const result = await buyerApi.get<{ url: string }>(
        `files/${file.id}/access`,
      );
      const url = new URL(result.url);
      if (url.protocol !== "https:") throw Error("Unsafe file URL");
      if (win) win.location.href = url.href;
      else setError(t.failed);
    } catch {
      win?.close();
      setError(t.failed);
    }
  }
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => void open()}>
        {file.name} ↗
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function InquiryConversation({ id }: { id: string }) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    member = useBuyerMember();
  const router = useRouter();
  const inquiry = useBuyer<Inquiry>("inquiries/" + id);
  const [messages, setMessages] = useState<Message[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<Error>(),
    [before, setBefore] = useState(false),
    [close, setClose] = useState(false),
    [reason, setReason] = useState(""),
    [closeError, setCloseError] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null),
    rowsRef = useRef<Message[]>([]),
    queue = useRef<ReadPositionQueue | null>(null),
    closeKey = useRef<{ body: string; key: string } | null>(null);
  const refreshInquiry = inquiry.retry;
  const visible = useCallback(() => {
    if (document.visibilityState !== "visible" || !bodyRef.current) return;
    const bounds = bodyRef.current.getBoundingClientRect();
    const rects = Array.from(
      bodyRef.current.querySelectorAll<HTMLElement>("[data-sequence]"),
    ).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        sequence: Number(node.dataset.sequence),
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
      };
    });
    queue.current?.observe(
      visibleMessagePosition(
        rects,
        Math.max(bounds.top, 0),
        Math.min(bounds.bottom, window.innerHeight),
      ),
    );
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const q = new ReadPositionQueue(async (position) => {
      const result = await buyerApi.write<{ readThroughSequence: number }>(
        `inquiries/${id}/read`,
        { readThroughSequence: position },
        undefined,
        "POST",
        member.id,
      );
      window.dispatchEvent(new Event("buyer-data"));
      return result;
    });
    queue.current = q;
    rowsRef.current = [];
    setMessages([]);
    setLoading(true);
    buyerApi
      .get<MessagePage>(`inquiries/${id}/messages`, controller.signal)
      .then((data) => {
        if (!active) return;
        q.reset(data.readThroughSequence);
        rowsRef.current = data.items;
        setMessages(data.items);
        setBefore(data.hasMoreBefore);
        setLoading(false);
        setError(undefined);
        requestAnimationFrame(() => {
          if (bodyRef.current)
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
          visible();
        });
      })
      .catch((e) => {
        if (active) {
          setLoading(false);
          setError(e);
        }
      });
    let polling = false;
    const poll = window.setInterval(async () => {
      if (!active || polling || document.visibilityState !== "visible") return;
      polling = true;
      try {
        const latest = rowsRef.current.at(-1)?.sequence || 0;
        const data = await buyerApi.get<MessagePage>(
          `inquiries/${id}/messages?afterSequence=${latest}`,
          controller.signal,
        );
        if (!active) return;
        refreshInquiry();
        rowsRef.current = mergeMessages(rowsRef.current, data.items);
        setMessages(rowsRef.current);
        const receipts = await readKnownReceipts(
          (cursor) =>
            buyerApi.get(
              `inquiries/${id}/message-receipts?afterSequence=${cursor}`,
              controller.signal,
            ),
          Math.max(0, (rowsRef.current[0]?.sequence || 1) - 1),
          rowsRef.current.at(-1)?.sequence || 0,
        );
        if (!active) return;
        rowsRef.current = rowsRef.current.map((m) => {
          const r = receipts.find((r) => r.messageId === m.id);
          return r
            ? {
                ...m,
                recipientRead: r.recipientRead,
                quote: r.quote || m.quote,
              }
            : m;
        });
        setMessages(rowsRef.current);
        visible();
      } catch (e) {
        if (active) setError(e as Error);
      } finally {
        polling = false;
      }
    }, 5000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("resize", visible);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(poll);
      q.invalidate();
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("resize", visible);
    };
  }, [id, member.id, version, visible, refreshInquiry]);
  useEffect(() => {
    visible();
  }, [messages, visible]);
  async function older() {
    try {
      const data = await buyerApi.get<MessagePage>(
        `inquiries/${id}/messages?beforeSequence=${messages[0]?.sequence || 1}`,
      );
      rowsRef.current = mergeMessages(rowsRef.current, data.items);
      setMessages(rowsRef.current);
      setBefore(data.hasMoreBefore);
    } catch (e) {
      setError(e as Error);
    }
  }
  async function closeInquiry() {
    if (!inquiry.data || busy) return;
    setBusy(true);
    setCloseError("");
    try {
      const body = {
          expectedVersion: inquiry.data.version,
          reason: reason.trim(),
        },
        serialized = JSON.stringify(body);
      if (closeKey.current?.body !== serialized)
        closeKey.current = { body: serialized, key: crypto.randomUUID() };
      await buyerApi.write(
        `inquiries/${id}/close`,
        body,
        closeKey.current!.key,
        "POST",
        member.id,
      );
      setClose(false);
      inquiry.retry();
    } catch (e) {
      setCloseError(buyerError(e, locale));
      inquiry.retry();
    } finally {
      setBusy(false);
    }
  }
  function repeat() {
    const i = inquiry.data!;
    const items = i.items.map((item) => ({
      ...item.product,
      enterpriseId: i.enterpriseId,
      quantity: item.quantity,
    }));
    const draftId = saveIndependentForm(member.id, {
      fromList: false,
      enterpriseId: i.enterpriseId,
      subject: i.subject,
      description: i.description,
      contactName: i.contactName,
      contactPhone: i.contactPhone,
      buyerCompanyName: i.buyerCompanyName,
      orderKind: i.orderKind === "custom" ? "custom" : "standard",
      items,
      attachments: [],
    });
    router.push(
      `/buyer/inquiries/new?enterpriseId=${i.enterpriseId}&draftId=${draftId}`,
    );
  }
  const i = inquiry.data;
  return (
    <>
      <Link className={styles.link} href="/buyer/inquiries">
        {t.back}
      </Link>
      <BuyerHead
        title={i?.subject || t.detail}
        intro={t.conversationIntro}
        action={i && <QuoteHistory inquiryId={id} />}
      />
      <BuyerStatus {...inquiry} />
      {i && (
        <div className={styles.chatLayout}>
          <section className={styles.chat}>
            <div className={styles.chatHead}>
              <strong>
                {locale === "en" && i.enterpriseNameEn
                  ? i.enterpriseNameEn
                  : i.enterpriseName}
              </strong>
              <p className={styles.hint}>
                {i.number} · {inquiryStatus(i.status, locale)}
              </p>
            </div>
            <BuyerStatus
              loading={loading}
              error={error}
              retry={() => setVersion((v) => v + 1)}
            />
            <div ref={bodyRef} className={styles.chatBody} onScroll={visible}>
              {before && (
                <Button variant="outline" onClick={() => void older()}>
                  {t.loadOlder}
                </Button>
              )}
              {messages.map((message) => (
                <article
                  key={message.id}
                  data-sequence={message.sequence}
                  className={`${styles.message} ${message.sender.actorType === "member" && message.sender.actorId === member.id ? styles.mine : ""}`}
                >
                  <span className={styles.sender}>
                    {message.sender.displayName}
                  </span>
                  <div className={styles.bubble}>
                    {message.text}
                    {message.attachments.map((file) => (
                      <FileLink key={file.id} file={file} />
                    ))}
                    {message.quote && (
                      <div className={styles.quoteCard}>
                        <strong>{t.quote}</strong>
                        <p>
                          {money(
                            message.quote.totalAmount,
                            message.quote.currency,
                          )}
                        </p>
                        <Link
                          className={styles.link}
                          href={"/buyer/quotes/" + message.quote.id}
                        >
                          {t.quoteDetails}
                        </Link>
                      </div>
                    )}
                  </div>
                  <small>
                    {new Date(message.createdAt).toLocaleString(
                      locale === "en" ? "en-GB" : "zh-CN",
                    )}
                    {message.sender.actorType === "member"
                      ? " · " + (message.recipientRead ? t.read : t.sent)
                      : ""}
                  </small>
                </article>
              ))}
            </div>
            {i.status === "closed" ? (
              <div className={styles.composer}>
                <p>{t.closedHint}</p>
                <Button variant="outline" onClick={repeat}>
                  {t.repeat} →
                </Button>
              </div>
            ) : (
              <MessageComposer
                key={id}
                inquiryId={id}
                onSent={(message) => {
                  rowsRef.current = mergeMessages(rowsRef.current, [message]);
                  setMessages(rowsRef.current);
                  requestAnimationFrame(() => {
                    if (bodyRef.current)
                      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
                  });
                  inquiry.retry();
                }}
              />
            )}
          </section>
          <aside className={styles.chatSide}>
            <section className={styles.panel}>
              <h2>{t.inquiryInfo}</h2>
              <p>{i.contactName}</p>
              <p>{i.contactPhone}</p>
              <p>{i.description}</p>
              {i.items.map((item) => (
                <div className={styles.notice} key={item.id}>
                  <strong>{productLabels(item.product, locale).name}</strong>
                  <p>
                    {productLabels(item.product, locale).specification} ·{" "}
                    {item.quantity} {t[item.product.unit]}
                  </p>
                </div>
              ))}
              {i.attachments.map((file) => (
                <FileLink key={file.id} file={file} />
              ))}
              <Link
                className={styles.link}
                href={"/suppliers/" + i.enterpriseId}
              >
                {t.profile}
              </Link>
              {i.actions.some((a) => a.code === "close" && a.enabled) && (
                <div className={styles.actions}>
                  <Button variant="outline" onClick={() => setClose(true)}>
                    {t.closeInquiry}
                  </Button>
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
      <Modal
        open={close}
        onClose={() => setClose(false)}
        title={t.closeConfirm}
        footer={
          <>
            <Button variant="outline" onClick={() => setClose(false)}>
              {t.cancel}
            </Button>
            <Button
              disabled={!reason.trim()}
              loading={busy}
              onClick={() => void closeInquiry()}
            >
              {t.closeInquiry}
            </Button>
          </>
        }
      >
        <p>{t.closeHint}</p>
        {closeError && (
          <p role="alert" className={styles.error}>
            {closeError}
          </p>
        )}
        <Field
          className={styles.field}
          label={t.closeReason}
          multiline
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </>
  );
}
