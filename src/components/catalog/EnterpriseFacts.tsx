"use client";
import type { EnterpriseSummary } from "@/src/lib/catalog/model";
import { catalogCopy } from "@/src/lib/catalog/copy";
import { useFoundation } from "../Providers";
export function EnterpriseFacts({
  enterprise: e,
  full = false,
}: {
  enterprise: EnterpriseSummary & { address?: string | null };
  full?: boolean;
}) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  const scales: Record<string, string> =
    locale === "en"
      ? {
          lt50: "Under 50",
          s50_100: "50–100",
          s100_300: "100–300",
          s300_500: "300–500",
          gte500: "500+",
        }
      : {
          lt50: "50人以下",
          s50_100: "50–100人",
          s100_300: "100–300人",
          s300_500: "300–500人",
          gte500: "500人以上",
        };
  const fields = [
    ...(full
      ? [
          { label: t.companyName, value: e.legalName || e.name },
          { label: t.industry, value: e.industryName },
          { label: t.address, value: e.address },
        ]
      : []),
    { label: t.location, value: e.city },
    {
      label: t.employees,
      value: e.scaleCode ? scales[e.scaleCode] : undefined,
    },
    { label: t.founded, value: e.foundedYear },
  ].filter((f) => f.value);
  return (
    <dl
      className={
        full
          ? "grid gap-5 sm:grid-cols-2"
          : "mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600"
      }
    >
      {fields.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className={full ? "text-sm text-ink-500" : "inline"}>
            {f.label}
            {full ? null : ": "}
          </dt>
          <dd className={full ? "mt-1 break-words" : "inline break-words"}>
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
