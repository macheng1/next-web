"use client";
import { TextArea } from "@douyinfe/semi-ui-19";
import { useEffect, useRef, useState } from "react";
import type { Attachment, Message } from "@/src/lib/buyer/types";
import { buyerApi } from "@/src/lib/buyer/api";
import { buyerError } from "@/src/lib/buyer/errors";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { AttachmentPicker } from "./AttachmentPicker";
import { useBuyerMember } from "./BuyerShell";
import styles from "./buyer.module.css";
export function MessageComposer({
  inquiryId,
  onSent,
}: {
  inquiryId: string;
  onSent: (message: Message) => void;
}) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    member = useBuyerMember();
  const [text, setText] = useState(""),
    [files, setFiles] = useState<Attachment[]>([]),
    [uploading, setUploading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const lock = useRef(false),
    replay = useRef<{ body: string; key: string; clientId: string } | null>(
      null,
    );
  const storageKey = `buyer-chat-v1:${member.id}:${inquiryId}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved) {
        setText(typeof saved.text === "string" ? saved.text : "");
        setFiles(Array.isArray(saved.files) ? saved.files : []);
        replay.current = saved.replay || null;
      }
    } catch {
      /* Corrupt local draft cannot establish identity or grant access. */
    }
    setReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (ready)
      localStorage.setItem(
        storageKey,
        JSON.stringify({ text, files, replay: replay.current }),
      );
  }, [storageKey, text, files, ready]);
  async function send() {
    if (lock.current || uploading || (!text.trim() && !files.length)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const content = {
        kind: files.length ? "file" : "text",
        text: text.trim() || undefined,
        attachmentIds: files.map((f) => f.id),
      };
      const body = JSON.stringify(content);
      if (replay.current?.body !== body)
        replay.current = {
          body,
          key: crypto.randomUUID(),
          clientId: crypto.randomUUID(),
        };
      localStorage.setItem(
        storageKey,
        JSON.stringify({ text, files, replay: replay.current }),
      );
      const result = await buyerApi.write<Message>(
        `inquiries/${inquiryId}/messages`,
        { ...content, clientMessageId: replay.current!.clientId },
        replay.current!.key,
        "POST",
        member.id,
      );
      setText("");
      setFiles([]);
      replay.current = null;
      localStorage.removeItem(storageKey);
      onSent(result);
    } catch (error) {
      setError(buyerError(error, locale));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className={`shhy-field ${styles.composer}`}
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <TextArea
        className={styles.textarea}
        aria-label={t.messagePlaceholder}
        placeholder={t.messagePlaceholder}
        value={text}
        maxLength={2000}
        disabled={busy || !ready}
        onChange={(value) => setText(value)}
      />
      <AttachmentPicker
        files={files}
        onChange={setFiles}
        purpose="message"
        resourceId={inquiryId}
        onBusy={setUploading}
        disabled={busy || !ready}
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button
          htmlType="submit"
          loading={busy}
          disabled={uploading || !ready || (!text.trim() && !files.length)}
        >
          {busy ? t.submitting : error ? t.retry : t.send}
        </Button>
      </div>
    </form>
  );
}
