import en from "@/src/dictionaries/en.json";
import zh from "@/src/dictionaries/zh.json";
export function buyerCopy(locale: string) {
  return locale === "en" ? en.buyer : zh.buyer;
}
export function inquiryStatus(value: string, locale: string) {
  const copy = buyerCopy(locale);
  return (
    (
      {
        pending_reply: copy.pending_reply,
        negotiating: copy.negotiating,
        quoted: copy.quoted,
        ordered: copy.ordered,
        closed: copy.closed,
        draft: copy.draft,
        sent: copy.sent,
        accepted: locale === "en" ? "Accepted" : "已接受",
        rejected: locale === "en" ? "Rejected" : "已拒绝",
        expired: locale === "en" ? "Expired" : "已过期",
        withdrawn: locale === "en" ? "Withdrawn" : "已撤回",
        superseded: locale === "en" ? "Superseded" : "已被替代",
        invalidated: locale === "en" ? "Invalidated" : "已失效",
      } as Record<string, string>
    )[value] || value
  );
}

export function unitLabel(value: unknown, locale: string) {
  const t = buyerCopy(locale);
  return (
    (
      { piece: t.piece, set: t.set, kg: t.kg, meter: t.meter } as Record<
        string,
        string
      >
    )[String(value)] || String(value || "")
  );
}
export function productLabels(
  product: {
    name: string;
    specification?: string;
    translations?: {
      en?: { name?: string | null; specification?: string | null };
    };
  },
  locale: string,
) {
  return {
    name:
      locale === "en" &&
      typeof product.translations?.en?.name === "string" &&
      product.translations.en.name.trim()
        ? product.translations.en.name
        : product.name,
    specification:
      locale === "en" &&
      typeof product.translations?.en?.specification === "string" &&
      product.translations.en.specification.trim()
        ? product.translations.en.specification
        : product.specification,
  };
}
