import { describe, expect, it } from "vitest";
import { COOKIE_CONSENT_MAX_AGE, cookieChoiceHeader, parseCookieChoice, readCookieChoice, optionalCookiesAllowed } from "@/src/lib/cookie-consent";
describe("cookie consent", () => {
  it("defaults to no optional consent and rejects obsolete or unknown records", () => {
    for (const value of [undefined, "all", "v0:all", "v1:unknown"]) expect(parseCookieChoice(value)).toBeNull();
    expect(optionalCookiesAllowed()).toBe(false);
  });
  it("reads its own choice independently of login and language cookies", () => {
    expect(readCookieChoice("member_token=abc; NEXT_LOCALE=en; manulink_cookie_consent=v1:necessary")).toBe("necessary");
    expect(readCookieChoice("manulink_cookie_consent=v1:all; member_token=abc")).toBe("all");
    expect(readCookieChoice("other_manulink_cookie_consent=v1:all")).toBeNull();
  });
  it("stores both choices for 180 days on the site with secure cookies on HTTPS", () => {
    expect(COOKIE_CONSENT_MAX_AGE).toBe(15552000);
    expect(cookieChoiceHeader("all", true)).toBe("manulink_cookie_consent=v1:all; Path=/; Max-Age=15552000; SameSite=Lax; Secure");
    expect(cookieChoiceHeader("necessary", false)).not.toContain("Secure");
  });
});
