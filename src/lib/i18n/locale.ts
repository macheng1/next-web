export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export function isLocale(value: unknown): value is Locale {
  return value === "zh" || value === "en";
}
export function resolveLanguage(input: {
  pathLocale?: string;
  cookieLocale?: string;
  acceptLanguage?: string;
}): Locale {
  if (isLocale(input.pathLocale)) return input.pathLocale;
  if (isLocale(input.cookieLocale)) return input.cookieLocale;
  const candidates = (input.acceptLanguage || "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const raw = params.find((v) => v.trim().startsWith("q="));
      const q = raw ? Number(raw.trim().slice(2)) : 1;
      return { locale: tag.split("-")[0], q, index };
    })
    .filter((v) => Number.isFinite(v.q) && v.q > 0 && v.q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return (candidates.find((v) => isLocale(v.locale))?.locale as Locale) || "zh";
}
