"use client";
import { useState, type ReactNode } from "react";
import { IconEyeOpened, IconEyeClosed } from "@douyinfe/semi-icons";
import { Input } from "@douyinfe/semi-ui-19";
import type { InputProps } from "@douyinfe/semi-ui-19/lib/es/input";
import { Button } from "../Button";
import { useFoundation } from "../Providers";
import { authCopy } from "@/src/lib/auth/copy";
import styles from "./auth.module.css";
export function AuthField({
  label,
  aside,
  ...props
}: Omit<InputProps, "onChange"> & { onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void } & {
  label: string;
  aside?: ReactNode;
  id: string;
}) {
  const [visible, setVisible] = useState(false);
  const { locale } = useFoundation();
  const t = authCopy(locale);
  const password = props.type === "password";
  return (
    <div className={`shhy-field ${styles.field}`}>
      <div className={styles.labelRow}>
        <label htmlFor={props.id}>{label}</label>
        {aside}
      </div>
      <div className={password ? styles.password : undefined}>
        <Input
          {...props}
          onChange={(_, event) => props.onChange?.(event)}
          className={styles.input}
          style={{ minHeight: 48 }}
          type={password && visible ? "text" : props.type}
          aria-describedby="auth-error"
        />
        {password && (
          <Button
            variant="ghost"
            size={32}
            className={styles.eye}
            htmlType="button"
            disabled={props.disabled}
            aria-label={visible ? t.hidePassword : t.showPassword}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
            icon={visible ? <IconEyeClosed /> : <IconEyeOpened />}
          />
        )}
      </div>
    </div>
  );
}
export function AuthError({ message }: { message: string }) {
  return (
    <div
      id="auth-error"
      role={message ? "alert" : undefined}
      className={message ? `${styles.notice} ${styles.error}` : undefined}
    >
      {message}
    </div>
  );
}
