import type { ReactNode } from "react";

/**
 * 认证页内部的公共零件。
 *
 * 放在 `AuthShell/` 目录下而不是各建一个组件目录：它们只在认证页内部使用
 * （`AuthShell` 给外框、`parts` 给卡内的标题与提示条），
 * 不属于通用组件库，因此不进 `src/components/index.ts` 的出口。
 */

/** 卡片内的标题区。三个认证页共用，保证字阶与间距完全一致 */
export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-7">
      <h1 className="font-display text-h1 text-ink-900">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sub text-ink-500">{subtitle}</p>}
    </header>
  );
}

function NoticeIcon({ tone }: { tone: "success" | "error" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[3px] size-4 shrink-0"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.6" stroke="currentColor" />
      {tone === "success" ? (
        <path d="M5.3 8.2 7.1 10l3.6-3.8" stroke="currentColor" />
      ) : (
        <>
          <path d="M8 5v3.6" stroke="currentColor" />
          <path d="M8 11h.01" stroke="currentColor" />
        </>
      )}
    </svg>
  );
}

/**
 * 提示条。
 *
 * 规范 §10：错误必须是「颜色 + 图标 + 文案」三重提示，不能只靠红色 ——
 * 所以这里的成功 / 失败两种形态都带图标，读屏也通过 `role` 播报。
 * 颜色取自语义令牌（`success-bg` / `error-bg`），不写死十六进制。
 */
export function AuthNotice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: ReactNode;
}) {
  const success = tone === "success";
  return (
    <p
      role={success ? "status" : "alert"}
      className={
        success
          ? "flex items-start gap-2 rounded-sm bg-success-bg px-3.5 py-2.5 text-sub text-success"
          : "flex items-start gap-2 rounded-sm bg-error-bg px-3.5 py-2.5 text-sub text-error"
      }
    >
      <NoticeIcon tone={tone} />
      <span>{children}</span>
    </p>
  );
}
