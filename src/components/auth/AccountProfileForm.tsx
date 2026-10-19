"use client";
import { Upload } from "@douyinfe/semi-ui-19";
import Link from "next/link";
import { useState } from "react";
import { updateProfile, uploadAvatar } from "@/src/lib/auth-api";
import type { WebMember } from "@/src/lib/server/session";
import { Button } from "../Button";
import { AuthField, AuthError } from "./AuthField";
import { useAuthTask } from "./use-auth-task";
import styles from "./auth.module.css";
export function AccountProfileForm({
  member,
  embedded = false,
  onSaved,
}: {
  member: WebMember;
  embedded?: boolean;
  onSaved?: () => void;
}) {
  const [nickname, setNickname] = useState(member.nickname || "");
  const [saved, setSaved] = useState(false);
  const task = useAuthTask();
  const { t } = task;
  return (
    <>
      {!embedded && (
        <Link href="/account" className={styles.back}>
          {t.backAccount}
        </Link>
      )}
      <h2>{t.editProfile}</h2>
      <p className={styles.intro}>{member.email}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);
          void task.run(async () => {
            await updateProfile(nickname);
            setSaved(true);
            onSaved?.();
          });
        }}
      >
        <AuthField
          id="nickname"
          label={t.nickname}
          maxLength={32}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={task.pending}
        />
        <Button
          block
          size="lg"
          radius={8}
          htmlType="submit"
          loading={task.pending}
          className={styles.primary}
        >
          {t.save}
        </Button>
      </form>
      <div className={styles.field}>
        <label>{t.avatar}</label>
        <Upload
          action=""
          uploadTrigger="custom"
          fileList={[]}
          showUploadList={false}
          accept="image/jpeg,image/png,image/webp"
          disabled={task.pending}
          onFileChange={(files) => {
            const file = files[0];
            if (!file) return;
            setSaved(false);
            void task.run(async () => {
              await uploadAvatar(file);
              setSaved(true);
              onSaved?.();
            });
          }}
        >
          <Button variant="outline" disabled={task.pending}>{t.avatar}</Button>
        </Upload>
        <p className={styles.hint}>{t.avatarHint}</p>
      </div>
      <AuthError message={task.error} />
      {saved && (
        <p role="status" className={styles.notice}>
          {t.saved}
        </p>
      )}
    </>
  );
}
