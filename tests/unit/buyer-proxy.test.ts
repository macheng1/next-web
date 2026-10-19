import { it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { buyerProxy } from "../../src/lib/server/buyer-proxy";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function req(
  path: string,
  method = "GET",
  cookie = true,
  origin = "http://localhost:3000",
  body?: unknown,
) {
  vi.stubEnv("DEPLOYMENT_ENV", "test");
  vi.stubEnv("MEMBER_API_URL", "http://localhost:4000/api/v1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  return new NextRequest("http://localhost:3000/api/buyer/" + path, {
    method,
    headers: {
      origin,
      "content-type": "application/json",
      "x-source-type": "miniapp",
      "x-expected-member-id": "11111111-1111-4111-8111-111111111111",
      ...(cookie ? { cookie: "public_web_token=private-token" } : {}),
      "idempotency-key": "77777777-7777-4777-8777-777777777777",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
it("never forwards forged browser source and keeps server bearer off the response", async () => {
  const fetch = vi.fn(async () =>
    Response.json({ code: 200, data: { items: [] } }),
  );
  vi.stubGlobal("fetch", fetch);
  const result = await buyerProxy(req("inquiries"), ["inquiries"]);
  const headers = new Headers(
    (fetch.mock.calls as unknown as [string, RequestInit][])[0]?.[1]?.headers,
  );
  expect(headers.get("authorization")).toBe("Bearer private-token");
  expect(headers.get("x-source-type")).toBe("portal-web");
  expect(await result.text()).not.toContain("private-token");
  expect(result.headers.get("cache-control")).toBe("no-store");
});
it("rejects unauthenticated, cross-origin and unapproved trading actions before outbound calls", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(
    (await buyerProxy(req("inquiries", "GET", false), ["inquiries"])).status,
  ).toBe(401);
  expect(
    (
      await buyerProxy(
        req("inquiries", "POST", true, "https://untrusted.example", {
          subject: "x",
        }),
        ["inquiries"],
      )
    ).status,
  ).toBe(403);
  expect((await buyerProxy(req("orders", "POST"), ["orders"])).status).toBe(
    404,
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves stable idempotency keys for write retries", async () => {
  const fetch = vi.fn(async (url: string) =>
    Response.json({
      code: 200,
      data: url.includes("/site-auth/me")
        ? { id: "11111111-1111-4111-8111-111111111111" }
        : {},
    }),
  );
  vi.stubGlobal("fetch", fetch);
  await buyerProxy(req("inquiries", "POST", true, undefined, {}), [
    "inquiries",
  ]);
  const headers = new Headers(
    (fetch.mock.calls as unknown as [string, RequestInit][])[1]?.[1]?.headers,
  );
  expect(headers.get("idempotency-key")).toBe(
    "77777777-7777-4777-8777-777777777777",
  );
});
it("rejects a stale mounted member before a new-cookie mutation reaches backend", async () => {
  const fetch = vi.fn(async () =>
    Response.json({
      code: 200,
      data: { id: "88888888-8888-4888-8888-888888888888" },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const request = req("inquiries", "POST", true, undefined, {});
  request.headers.set(
    "x-expected-member-id",
    "11111111-1111-4111-8111-111111111111",
  );
  const result = await buyerProxy(request, ["inquiries"]);
  expect(result.status).toBe(409);
  expect(fetch).toHaveBeenCalledTimes(1);
});
