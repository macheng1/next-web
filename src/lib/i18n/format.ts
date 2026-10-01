import type { Locale } from "./locale";
const language = { zh: "zh-CN", en: "en-US" };
export function formatMoney(
  value: number,
  currency: string,
  locale: Locale,
): string {
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(value))
    throw new Error("Explicit currency and finite amount required");
  return new Intl.NumberFormat(language[locale], {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(value);
}
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(language[locale]).format(value);
}
export function formatDate(
  value: Date,
  locale: Locale,
  timeZone: string,
): string {
  if (!timeZone) throw new Error("Explicit timezone required");
  return new Intl.DateTimeFormat(language[locale], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(value);
}
