import { it, expect } from "vitest";
import { resolveLanguage } from "../../src/lib/i18n/locale";
import { formatMoney, formatDate } from "../../src/lib/i18n/format";
import zh from "../../src/dictionaries/zh.json";
import en from "../../src/dictionaries/en.json";
it("uses URL before cookie and respects language preferences", () => {
  expect(resolveLanguage({ pathLocale: "en", cookieLocale: "zh" })).toBe("en");
  expect(
    resolveLanguage({
      cookieLocale: "../../evil",
      acceptLanguage: "en-US,en;q=0.9",
    }),
  ).toBe("en");
  expect(resolveLanguage({ acceptLanguage: "en;q=0,zh;q=0.5" })).toBe("zh");
  expect(resolveLanguage({ acceptLanguage: "xx;q=1,en;q=0.8,zh;q=0.9" })).toBe(
    "zh",
  );
});
it("requires currency and explicit timezone", () => {
  expect(formatMoney(12.5, "USD", "en")).toContain("12.50");
  expect(() => formatMoney(12.5, "", "en")).toThrow();
  expect(formatDate(new Date("2026-01-01T23:30:00Z"), "en", "UTC")).toContain(
    "01/01/2026",
  );
  expect(
    formatDate(new Date("2026-01-01T23:30:00Z"), "en", "Asia/Shanghai"),
  ).toContain("01/02/2026");
});
it("keeps dictionary keys aligned recursively", () => {
  const keys = (obj: object, prefix = ""): string[] =>
    Object.entries(obj)
      .flatMap(([k, v]) =>
        v && typeof v === "object"
          ? keys(v, `${prefix}${k}.`)
          : [`${prefix}${k}`],
      )
      .sort();
  expect(keys(en)).toEqual(keys(zh));
});
