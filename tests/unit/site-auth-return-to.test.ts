import { expect, it } from "vitest";
import { safeReturnTo } from "../../src/lib/auth/return-to";
it.each([
  "https://evil.test",
  "//evil.test",
  "/\\evil.test",
  "/%2f%2fevil.test",
  "/login",
  "/register?next=/login",
  "/api/auth/logout",
  "/account\n",
])("rejects unsafe or looping return destination %s", (value) => {
  expect(safeReturnTo(value)).toBe("/account");
});
it("keeps a valid site destination and its query", () => {
  expect(safeReturnTo("/products?category=1")).toBe("/products?category=1");
});
it("handles duplicate query values as untrusted input instead of throwing", () => {
  expect(safeReturnTo(["/products", "/account"] as never)).toBe("/account");
});
