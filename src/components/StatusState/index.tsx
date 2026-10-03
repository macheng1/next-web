"use client";
import { Empty, Spin } from "@douyinfe/semi-ui-19";
import {
  IconAlertCircle,
  IconInbox,
  IconLock,
  IconSpin,
} from "@douyinfe/semi-icons";
import { Button } from "@/src/components/Button";
import { useFoundation } from "@/src/components/Providers";
import { foundationCopy } from "@/src/lib/i18n/foundation";
import type { Locale } from "@/src/lib/i18n/locale";
export type StatusKind =
  "loading" | "empty" | "error" | "forbidden" | "session-expired" | "not-found";
export function StatusState({
  kind,
  locale,
  onRetry,
}: {
  kind: StatusKind;
  locale?: Locale;
  onRetry?: () => void;
}) {
  const context = useFoundation();
  const copy = foundationCopy(locale || context.locale);
  const message =
    kind === "session-expired"
      ? copy.sessionExpired
      : kind === "not-found"
        ? copy.notFound
        : copy[kind];
  return (
    <section
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        maxWidth: 640,
        margin: "0 auto",
        overflowWrap: "anywhere",
      }}
    >
      {kind === "loading" ? (
        // Semi 默认 spin 图标的 linearGradient id 由模块自增计数器生成，SSR 与水合不一致；IconSpin 使用静态 id
        <Spin size="large" tip={message} indicator={<IconSpin spin />} />
      ) : (
        <>
          <Empty
            image={
              kind === "empty" ? (
                <IconInbox size="extra-large" />
              ) : kind === "forbidden" ? (
                <IconLock size="extra-large" />
              ) : (
                <IconAlertCircle size="extra-large" />
              )
            }
            title={message}
          />
          {onRetry && (
            <Button onClick={onRetry} style={{ marginTop: 24 }}>
              {copy.retry}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
