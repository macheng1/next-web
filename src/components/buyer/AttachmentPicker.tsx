"use client";
import { Upload } from "@douyinfe/semi-ui-19";
import { useRef, useState } from "react";
import type { Attachment } from "@/src/lib/buyer/types";
import { buyerApi } from "@/src/lib/buyer/api";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { useBuyerMember } from "./BuyerShell";
import styles from "./buyer.module.css";
export function AttachmentPicker({
  files,
  onChange,
  purpose,
  resourceId,
  onBusy,
  disabled = false,
}: {
  files: Attachment[];
  onChange: (files: Attachment[]) => void;
  purpose: "inquiry" | "message";
  resourceId?: string;
  onBusy: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const member = useBuyerMember();
  const lock = useRef(false);
  async function upload(selected: File[]) {
    if (disabled || lock.current) return;
    if (files.length + selected.length > 5) {
      setError(t.uploadHint);
      return;
    }
    lock.current = true;
    setBusy(true);
    onBusy(true);
    let next = [...files];
    try {
      for (const file of selected) {
        const attachment = await buyerApi.upload(
          file,
          purpose,
          resourceId,
          member.id,
        );
        next = [...next, attachment];
        onChange(next);
      }
      setError("");
    } catch {
      setError(t.failed + " " + t.uploadHint);
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div>
      <div className={styles.field}>{t.attachment}</div>
      <Upload
        action=""
        uploadTrigger="custom"
        fileList={[]}
        showUploadList={false}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        disabled={disabled || busy || files.length >= 5}
        onFileChange={(selected) => void upload(selected)}
      >
        <Button variant="outline" disabled={disabled || busy || files.length >= 5}>{t.upload}</Button>
      </Upload>
      <p className={styles.hint}>{busy ? t.uploading : t.uploadHint}</p>
      {files.map((file) => (
        <div className={styles.actions} key={file.id}>
          <span>{file.name}</span>
          <Button
            variant="ghost"
            disabled={disabled || busy}
            onClick={() => onChange(files.filter((f) => f.id !== file.id))}
          >
            {t.remove}
          </Button>
        </div>
      ))}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
