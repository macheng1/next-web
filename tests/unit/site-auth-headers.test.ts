import { expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy";
it("never forwards a password reset URL as a referrer or caches an account page", () => {
  const reset = proxy(
    new NextRequest("http://localhost:3000/reset-password?token=private"),
  );
  expect(reset.headers.get("referrer-policy")).toBe("no-referrer");
  expect(reset.headers.get("cache-control")).toBe("no-store");
  const account = proxy(new NextRequest("http://localhost:3000/account"));
  expect(account.headers.get("cache-control")).toBe("no-store");
});
it.each(["/google/complete", "/google/success?returnTo=%2Fbuyer"])("keeps Google page %s private and out of referrers", path => {
  const result = proxy(new NextRequest(`http://localhost:3000${path}`));
  expect(result.headers.get("referrer-policy")).toBe("no-referrer");
  expect(result.headers.get("cache-control")).toBe("no-store");
});
