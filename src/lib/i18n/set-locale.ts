import type { Locale } from "./locale";
/** Persist the explicit choice, then notify the existing language provider. */
export function setPreferredLocale(value: Locale) {
  document.cookie = `NEXT_LOCALE=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event("languagechange"));
}
