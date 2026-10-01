import { it, expect } from "vitest";
import { assertTrustedOrigin } from "../../src/lib/security/origin";
import { validateExternalUrl } from "../../src/lib/security/links";
import { buildSecurityHeaders } from "../../src/lib/security/headers";
import {
  SuccessfulSubmissions,
  MemoryRateLimiter,
} from "../../src/lib/security/rate-limit";
import { readBoundedBody } from "../../src/lib/server/mutation";
it("requires an exact trusted origin on mutations", () => {
  expect(() =>
    assertTrustedOrigin(new Request("https://site.test"), [
      "https://site.test",
    ]),
  ).toThrow();
  expect(() =>
    assertTrustedOrigin(
      new Request("https://site.test", {
        headers: { origin: "https://site.test.evil" },
      }),
      ["https://site.test"],
    ),
  ).toThrow();
  expect(() =>
    assertTrustedOrigin(
      new Request("https://site.test", {
        headers: { origin: "https://site.test" },
      }),
      ["https://site.test"],
    ),
  ).not.toThrow();
});
it("rejects unsafe URLs and enforces host allowlist", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "https://user:pass@site.test",
  ])
    expect(() => validateExternalUrl(url)).toThrow();
  expect(() =>
    validateExternalUrl("https://evil.test", ["site.test"]),
  ).toThrow();
  expect(
    validateExternalUrl("https://site.test/doc.pdf", ["site.test"]).pathname,
  ).toBe("/doc.pdf");
});
it("has nonce CSP without eval or wildcard scripts in production", () => {
  const headers = buildSecurityHeaders({
    production: true,
    nonce: "abc123",
    https: true,
  });
  const csp = headers.find((h) => h.key === "Content-Security-Policy")!.value;
  expect(csp).toContain("'nonce-abc123'");
  expect(csp).not.toContain("unsafe-eval");
  expect(csp).not.toContain("script-src *");
  expect(headers.some((h) => h.key === "Strict-Transport-Security")).toBe(true);
  expect(
    buildSecurityHeaders({ production: false }).some(
      (h) => h.key === "Strict-Transport-Security",
    ),
  ).toBe(false);
});
it("records duplicates only after success and expires them", () => {
  const store = new SuccessfulSubmissions(1000);
  expect(store.has("a", 100)).toBe(false);
  expect(store.has("a", 200)).toBe(false);
  store.mark("a", 300);
  expect(store.has("a", 400)).toBe(true);
  expect(store.has("a", 1400)).toBe(false);
});
it("limits and recovers after window", async () => {
  const limiter = new MemoryRateLimiter(1, 1000);
  expect((await limiter.check("a", 100)).allowed).toBe(true);
  expect(await limiter.check("a", 200)).toEqual({
    allowed: false,
    retryAfterSeconds: 1,
  });
  expect((await limiter.check("a", 1200)).allowed).toBe(true);
});
it("limits actual body without trusting content-length", async () => {
  const req = new Request("http://local", {
    method: "POST",
    body: "abcdef",
    headers: { "content-length": "1" },
  });
  await expect(readBoundedBody(req, 3)).rejects.toMatchObject({ status: 413 });
});
