/** Separate from authentication: logout must not remove this preference. */
export const COOKIE_CONSENT_KEY = "manulink_cookie_consent";
export const COOKIE_CONSENT_EVENT = "manulink:cookie-consent";
export const COOKIE_CONSENT_MAX_AGE = 180 * 24 * 60 * 60;
export type CookieChoice = "all" | "necessary";

export function parseCookieChoice(value: string | undefined): CookieChoice | null {
  return value === "v1:all" ? "all" : value === "v1:necessary" ? "necessary" : null;
}
export function readCookieChoice(cookies: string): CookieChoice | null {
  const value = cookies.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_CONSENT_KEY}=`))?.slice(COOKIE_CONSENT_KEY.length + 1);
  return parseCookieChoice(value);
}
export function cookieChoiceHeader(choice: CookieChoice, secure: boolean): string {
  return `${COOKIE_CONSENT_KEY}=v1:${choice}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

// In-memory fallback keeps the choice for this visit when browser storage is blocked.
let visitChoice: CookieChoice | null = null;
export function getCookieChoice(): CookieChoice | null {
  if (typeof document === "undefined") return null;
  return readCookieChoice(document.cookie) ?? visitChoice;
}
export function saveCookieChoice(choice: CookieChoice): void {
  visitChoice = choice;
  try { document.cookie = cookieChoiceHeader(choice, location.protocol === "https:"); } catch { /* Storage can be blocked in web views. */ }
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}
/** Optional integrations must check this before loading or sending events. */
export function optionalCookiesAllowed(): boolean {
  return getCookieChoice() === "all";
}
