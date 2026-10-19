import { describe, it, expect } from "vitest";
import { buyerPath } from "../../src/lib/server/buyer-path";
describe("buyer proxy allowlist", () => {
  it("accepts allowed reads and writes only", () => {
    expect(buyerPath("GET", ["inquiries"])).toBe("/web/buyer/inquiries");
    expect(buyerPath("PUT", ["favorites"])).toBe("/web/buyer/favorites");
  });
  it("rejects arbitrary paths and trading actions", () => {
    for (const path of [
      ["..", "members"],
      ["orders", "x"],
      ["quotes", "x", "accept"],
      ["inquiries", "%2f.."],
    ])
      expect(() => buyerPath("POST", path)).toThrow();
  });
  it("requires UUIDs for scoped records", () =>
    expect(() => buyerPath("GET", ["inquiries", "not-uuid"])).toThrow());
});
