"use client";
import type { ReactNode } from "react";
import {
  IconComment,
  IconGridView,
  IconFile,
  IconCoinMoney,
  IconChevronRight,
} from "@douyinfe/semi-icons";
import { catalogCopy } from "@/src/lib/catalog/copy";
import { useFoundation } from "../Providers";

/** Visible placeholders preserve the approved layout without pretending an action is live. */
export function ComingSoon({
  children,
  prominent = false,
  compact = false,
}: {
  children: ReactNode;
  prominent?: boolean;
  compact?: boolean;
}) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  return (
    <span
      aria-disabled="true"
      className={`inline-flex flex-wrap items-center justify-center gap-2 rounded-md ${compact ? "px-2 py-2 text-xs" : "min-h-11 px-4 py-2 text-sm"} ${prominent ? "bg-jade-700 text-white" : "border border-jade-200 text-jade-700"}`}
    >
      {children}
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] ${prominent ? "bg-white/15" : "bg-jade-50"}`}
      >
        {t.comingSoon}
      </span>
    </span>
  );
}
export function Chips({ values, empty }: { values: string[]; empty?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.length ? (
        values.map((v) => (
          <span
            key={v}
            className="max-w-full rounded-md bg-jade-50 px-2.5 py-1 text-xs break-words text-jade-800"
          >
            {v}
          </span>
        ))
      ) : (
        <p className="text-sm text-ink-500">{empty}</p>
      )}
    </div>
  );
}
export function UsefulTools() {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  return (
    <section id="useful-tools" className="min-w-0 scroll-mt-6">
      <h2 className="mb-4 text-lg font-semibold">{t.usefulTools}</h2>
      <div className="space-y-3">
        {[
          [t.weightTool, t.weightHint, IconGridView],
          [t.costTool, t.costHint, IconCoinMoney],
          [t.quoteTool, t.quoteHint, IconFile],
        ].map(([name, hint, Icon]) => {
          const ToolIcon = Icon as typeof IconGridView;
          return (
            <article
              key={String(name)}
              className="flex items-center gap-3 rounded-[6px] border border-ink-100 bg-white p-4"
            >
              <span className="rounded-[6px] bg-jade-50 p-3 text-jade-700">
                <ToolIcon size="large" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{String(name)}</h3>
                <p className="mt-1 text-xs text-ink-500">{String(hint)}</p>
                <span className="mt-2 inline-block rounded bg-jade-50 px-2 py-0.5 text-[10px] text-jade-700">
                  {t.comingSoon}
                </span>
              </div>
              <IconChevronRight className="text-ink-400" />
            </article>
          );
        })}
      </div>
    </section>
  );
}
export function ContactCard() {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  return (
    <aside className="flex gap-3 rounded-[6px] border border-jade-100 bg-jade-50 p-4 text-jade-800">
      <IconComment size="extra-large" />
      <div className="min-w-0">
        <h3 className="font-semibold">{t.contact}</h3>
        <p className="mt-1 text-xs text-ink-500">{t.contactHint}</p>
        <span className="mt-2 inline-block text-xs">{t.comingSoon}</span>
      </div>
    </aside>
  );
}
