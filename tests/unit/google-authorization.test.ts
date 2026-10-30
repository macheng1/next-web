import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as start } from "../../src/app/api/auth/google/start/route";
import { GET as callback } from "../../src/app/api/auth/google/callback/route";
import { proxyGoogle } from "../../src/lib/server/google-proxy";
import { sessionFingerprint } from "../../src/lib/server/google-authorization";
vi.mock("../../src/lib/server/google-vercel-identity", () => ({
  exchangeGoogleOnVercel: vi.fn(async () => "signed-identity"),
}));
beforeEach(() => {
  vi.stubEnv("DEPLOYMENT_ENV", "test");
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_REDIRECT_URI", "");
  vi.stubEnv("MEMBER_API_URL", "http://localhost:4000/api/v1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const member = { id: "buyer", memberType: "personal", email: "buyer@test.com" };
const session = {
  kind: "session",
  accessToken: "secret-session",
  expiresIn: 28800,
  member,
  mustChangePassword: false,
};
function request(
  path: string,
  body: object = {},
  cookie = "",
  memberId?: string,
) {
  return new NextRequest(`http://localhost:3000/api/auth/google/${path}`, {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      cookie,
      ...(memberId ? { "x-expected-member-id": memberId } : {}),
    },
    body: JSON.stringify(body),
  });
}
function cookieHeader(name: string, value: string) {
  return `${name}=${encodeURIComponent(value)}`;
}
async function attempt(cookie = "") {
  const response = await start(
    new NextRequest(
      "http://localhost:3000/api/auth/google/start?returnTo=%2Fbuyer%2Fsettings",
      { headers: { cookie } },
    ),
  );
  const url = new URL(response.headers.get("location")!);
  const state = url.searchParams.get("state")!;
  const saved = response.cookies.get(`google_attempt_${state}`)!;
  return { url, state, saved, header: cookieHeader(saved.name, saved.value) };
}
it("persists nonce and PKCE, isolates browser attempts and uses configured callback", async () => {
  const a = await attempt();
  const b = await attempt();
  const saved = JSON.parse(a.saved.value);
  expect(saved.nonce).toBe(a.url.searchParams.get("nonce"));
  expect(saved.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(a.url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(a.url.searchParams.get("redirect_uri")).toBe(
    "http://localhost:3000/api/auth/google/callback",
  );
  expect(a.saved.name).not.toBe(b.saved.name);
});
it("rejects untrusted state without calling backend or clearing other attempts", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const a = await attempt();
  const result = await callback(
    new NextRequest(
      "http://localhost:3000/api/auth/google/callback?code=untrusted&state=wrong",
      { headers: { cookie: a.header } },
    ),
  );
  expect(
    new URL(result.headers.get("location")!).searchParams.get("reason"),
  ).toBe("google-invalid");
  expect(result.cookies.get(a.saved.name)).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects session switching before exchanging code", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const a = await attempt();
  const result = await callback(
    new NextRequest(
      `http://localhost:3000/api/auth/google/callback?code=code&state=${a.state}`,
      { headers: { cookie: `${a.header}; public_web_token=switched` } },
    ),
  );
  expect(result.cookies.get("public_web_token")).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
  expect(result.cookies.get(a.saved.name)?.value).toBe("");
});
it("exchanges verified result and writes session only in HttpOnly cookie", async () => {
  const timer = vi.spyOn(globalThis, "setTimeout");
  const fetch = vi.fn(async (...args: [string, RequestInit]) => {
    expect(args[0]).toContain("google/exchange");
    return Response.json({ code: 200, data: session });
  });
  vi.stubGlobal("fetch", fetch);
  const a = await attempt();
  const result = await callback(
    new NextRequest(
      `http://localhost:3000/api/auth/google/callback?code=authorization-secret&state=${a.state}`,
      { headers: { cookie: a.header } },
    ),
  );
  const timeouts = timer.mock.calls.map((call) => call[1]);
  timer.mockRestore();
  expect(timeouts).toContain(20_000);
  expect(result.cookies.get("public_web_token")?.value).toBe("secret-session");
  expect(new URL(result.headers.get("location")!).pathname).toBe(
    "/google/success",
  );
  expect(
    new URL(result.headers.get("location")!).searchParams.get("returnTo"),
  ).toBe("/buyer/settings");
  expect(result.headers.get("location")).not.toContain("secret");
  expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toMatchObject({
    nonce: JSON.parse(a.saved.value).nonce,
    codeVerifier: JSON.parse(a.saved.value).verifier,
  });
  expect(result.headers.get("set-cookie")).toContain("HttpOnly");
});
it("stores pending grant privately and never returns it in redirect", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        code: 200,
        data: {
          kind: "pending",
          pendingToken: "private-pending",
          expiresIn: 600,
        },
      }),
    ),
  );
  const a = await attempt();
  const result = await callback(
    new NextRequest(
      `http://localhost:3000/api/auth/google/callback?code=code&state=${a.state}`,
      { headers: { cookie: a.header } },
    ),
  );
  expect(result.headers.get("location")).toBe(
    "http://localhost:3000/google/complete",
  );
  expect(result.cookies.get("public_web_token")).toBeUndefined();
  expect(JSON.parse(result.cookies.get("google_pending")!.value).token).toBe(
    "private-pending",
  );
});
it("cancellation consumes only its own attempt and does not call exchange", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const a = await attempt();
  const result = await callback(
    new NextRequest(
      `http://localhost:3000/api/auth/google/callback?error=access_denied&state=${a.state}`,
      { headers: { cookie: a.header } },
    ),
  );
  expect(
    new URL(result.headers.get("location")!).searchParams.get("reason"),
  ).toBe("google-cancelled");
  expect(result.cookies.get(a.saved.name)?.value).toBe("");
  expect(fetch).not.toHaveBeenCalled();
});
it("does not start binding without reauthentication", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ code: 200, data: member })),
  );
  const result = await start(
    new NextRequest("http://localhost:3000/api/auth/google/start?intent=link", {
      headers: { cookie: "public_web_token=existing" },
    }),
  );
  expect(result.headers.get("location")).toContain(
    "/buyer/settings?reason=google-invalid",
  );
});
it("rejects pending flow after session switch and mutation from foreign origin", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const pending = cookieHeader(
    "google_pending",
    JSON.stringify({
      token: "pending",
      fingerprint: sessionFingerprint(),
      returnTo: "/buyer",
    }),
  );
  expect(
    (
      await proxyGoogle(
        request("pending", {}, `${pending}; public_web_token=switched`),
        "pending",
      )
    ).status,
  ).toBe(401);
  const foreign = request("pending", {}, pending);
  foreign.headers.set("origin", "https://evil.test");
  expect((await proxyGoogle(foreign, "pending")).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});
it("completes pending registration with policy and no token in browser JSON", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ code: 200, data: session })),
  );
  const pending = cookieHeader(
    "google_pending",
    JSON.stringify({
      token: "pending",
      fingerprint: sessionFingerprint(),
      returnTo: "/buyer/settings",
    }),
  );
  const result = await proxyGoogle(
    request(
      "complete",
      {
        acceptedTerms: true,
        pendingId: sessionFingerprint("pending"),
        policyVersion: "current",
        nickname: "Buyer",
        locale: "en",
      },
      pending,
    ),
    "complete",
  );
  expect(result.status).toBe(200);
  const raw = await result.text();
  expect(raw).not.toContain("secret-session");
  expect(raw).toContain("/buyer/settings");
  expect(result.cookies.get("google_pending")?.value).toBe("");
  expect(result.cookies.get("public_web_token")?.value).toBe("secret-session");
});
it("requires expected member for sensitive requests", async () => {
  const fetch = vi.fn(async () => Response.json({ code: 200, data: member }));
  vi.stubGlobal("fetch", fetch);
  const result = await proxyGoogle(
    request(
      "prepare",
      { currentPassword: "proof" },
      "public_web_token=session",
      "other",
    ),
    "prepare",
  );
  expect(result.status).toBe(401);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("keeps binding grants HttpOnly and binds them to current member and session", async () => {
  const fetch = vi.fn(async (url: string) =>
    Response.json({
      code: 200,
      data: url.endsWith("/me")
        ? member
        : { bindingGrant: "private-binding", expiresIn: 300 },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const result = await proxyGoogle(
    request(
      "prepare",
      { currentPassword: "proof" },
      "public_web_token=session",
      member.id,
    ),
    "prepare",
  );
  expect(result.status).toBe(200);
  expect(await result.text()).not.toContain("private-binding");
  expect(JSON.parse(result.cookies.get("google_binding")!.value)).toMatchObject(
    {
      memberId: member.id,
      fingerprint: sessionFingerprint("session"),
      grant: "private-binding",
    },
  );
});
it.each(["unlink", "set-password"] as const)(
  "clears session following successful %s",
  async (action) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        Response.json({
          code: 200,
          data: url.endsWith("/me") ? member : { message: "done" },
        }),
      ),
    );
    const result = await proxyGoogle(
      request(
        action,
        action === "unlink"
          ? { code: "123456" }
          : { code: "123456", newPassword: "Strong123!" },
        "public_web_token=session",
        member.id,
      ),
      action,
    );
    expect(result.status).toBe(200);
    expect(result.cookies.get("public_web_token")?.value).toBe("");
  },
);
it("does not open Google without configuration", async () => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "");
  expect(
    (
      await start(
        new NextRequest("http://localhost:3000/api/auth/google/start"),
      )
    ).status,
  ).toBe(503);
});
it("binds only the prepared current member and installs the rotated session", async () => {
  const fetch = vi.fn(async (url: string, options: RequestInit) => {
    if (url.endsWith("/me")) return Response.json({ code: 200, data: member });
    expect(new Headers(options.headers).get("authorization")).toBe(
      "Bearer old-session",
    );
    expect(new Headers(options.headers).get("x-expected-member-id")).toBe(
      member.id,
    );
    expect(JSON.parse(options.body as string).bindingGrant).toBe(
      "grant-secret",
    );
    return Response.json({
      code: 200,
      data: { ...session, kind: "linked", accessToken: "rotated-session" },
    });
  });
  vi.stubGlobal("fetch", fetch);
  const binding = cookieHeader(
    "google_binding",
    JSON.stringify({
      grant: "grant-secret",
      memberId: member.id,
      fingerprint: sessionFingerprint("old-session"),
      expiresAt: Date.now() + 300000,
    }),
  );
  const opened = await start(
    new NextRequest("http://localhost:3000/api/auth/google/start?intent=link", {
      headers: { cookie: `public_web_token=old-session; ${binding}` },
    }),
  );
  const state = new URL(opened.headers.get("location")!).searchParams.get(
    "state",
  )!;
  const saved = opened.cookies.get(`google_attempt_${state}`)!;
  expect(opened.cookies.get("google_binding")?.value).toBe("");
  const result = await callback(
    new NextRequest(
      `http://localhost:3000/api/auth/google/callback?code=code&state=${state}`,
      {
        headers: {
          cookie: `public_web_token=old-session; ${cookieHeader(saved.name, saved.value)}`,
        },
      },
    ),
  );
  expect(result.cookies.get("public_web_token")?.value).toBe("rotated-session");
  expect(
    new URL(result.headers.get("location")!).searchParams.get("returnTo"),
  ).toBe("/buyer/settings?reason=google-linked");
  expect(result.headers.get("location")).not.toContain("grant-secret");
});
it("does not issue a session for backend business rejection", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ code: 401, data: { errorKey: "google_invalid" } }),
    ),
  );
  const a = await attempt();
  const result = await callback(
    new NextRequest(
      `http://localhost:3000/api/auth/google/callback?code=code&state=${a.state}`,
      { headers: { cookie: a.header } },
    ),
  );
  expect(result.cookies.get("public_web_token")).toBeUndefined();
  expect(result.cookies.get(a.saved.name)?.value).toBe("");
  expect(
    new URL(result.headers.get("location")!).searchParams.get("reason"),
  ).toBe("google-invalid");
});
it("forwards only configured trusted-edge client IP at code exchange", async () => {
  vi.stubEnv("TRUST_PROXY", "true");
  const fetch = vi.fn(async (_url: string, options: RequestInit) => {
    expect(_url).toContain("google/exchange");
    const headers = new Headers(options.headers);
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.9");
    expect(headers.get("x-trace-id")).toBe(
      "12345678-1234-1234-1234-123456789abc",
    );
    return Response.json({ code: 200, data: session });
  });
  vi.stubGlobal("fetch", fetch);
  const a = await attempt();
  const result = await callback(
    new NextRequest(
      `http://localhost:3000/api/auth/google/callback?code=code&state=${a.state}`,
      {
        headers: {
          cookie: a.header,
          "x-forwarded-for": "203.0.113.9, 10.0.0.1",
          "x-trace-id": "12345678-1234-1234-1234-123456789abc",
        },
      },
    ),
  );
  expect(result.cookies.get("public_web_token")?.value).toBe("secret-session");
});
it.each(["expired", "missing-nonce"])(
  "rejects %s attempt before contacting backend",
  async (invalid) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const a = await attempt();
    const data = JSON.parse(a.saved.value);
    if (invalid === "expired") data.createdAt = Date.now() - 600001;
    else delete data.nonce;
    const result = await callback(
      new NextRequest(
        `http://localhost:3000/api/auth/google/callback?code=code&state=${a.state}`,
        {
          headers: { cookie: cookieHeader(a.saved.name, JSON.stringify(data)) },
        },
      ),
    );
    expect(result.cookies.get("public_web_token")).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  },
);
it("returns a nonsecret pending attempt identifier without its token", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        code: 200,
        data: {
          mode: "register",
          email: "buyer@test.com",
          nickname: "Buyer",
          requiresEmailVerification: false,
          passwordAvailable: false,
          canSendCode: true,
        },
      }),
    ),
  );
  const cookie = cookieHeader(
    "google_pending",
    JSON.stringify({
      token: "private-pending-a",
      fingerprint: sessionFingerprint(),
      returnTo: "/buyer",
    }),
  );
  const result = await proxyGoogle(request("pending", {}, cookie), "pending");
  const payload = await result.json();
  expect(payload.data.pendingId).toBe(sessionFingerprint("private-pending-a"));
  expect(JSON.stringify(payload)).not.toContain("private-pending-a");
});
it.each(["send-code", "complete"] as const)(
  "rejects stale page %s when a second tab replaces pending cookie",
  async (action) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const cookie = cookieHeader(
      "google_pending",
      JSON.stringify({
        token: "pending-b",
        fingerprint: sessionFingerprint(),
        returnTo: "/buyer",
      }),
    );
    const result = await proxyGoogle(
      request(
        action,
        {
          pendingId: sessionFingerprint("pending-a"),
          acceptedTerms: true,
          policyVersion: "current",
          code: "123456",
          locale: "en",
        },
        cookie,
      ),
      action,
    );
    expect(result.status).toBe(409);
    expect((await result.json()).errorKey).toBe("google_pending_expired");
    expect(fetch).not.toHaveBeenCalled();
    expect(result.cookies.get("public_web_token")).toBeUndefined();
  },
);
it("sends code only for matching pending identifier and strips identifier from backend body", async () => {
  const fetch = vi.fn(async (url: string, options: RequestInit) => {
    expect(url).toContain("google/send-code");
    expect(JSON.parse(options.body as string)).toEqual({
      pendingToken: "private-pending",
      locale: "en",
    });
    return Response.json({ code: 200, data: { retryAfter: 60 } });
  });
  vi.stubGlobal("fetch", fetch);
  const cookie = cookieHeader(
    "google_pending",
    JSON.stringify({
      token: "private-pending",
      fingerprint: sessionFingerprint(),
      returnTo: "/buyer",
    }),
  );
  const result = await proxyGoogle(
    request(
      "send-code",
      { pendingId: sessionFingerprint("private-pending"), locale: "en" },
      cookie,
    ),
    "send-code",
  );
  expect(result.status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("Vercel callback sends signed identity with the original attempt context to backend", async () => {
  vi.stubEnv("GOOGLE_AUTH_MODE", "vercel");
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        code: 200,
        data: { kind: "pending", pendingToken: "pending-token" },
      }),
    );
  vi.stubGlobal("fetch", fetch);
  const a = await attempt();
  const result = await callback(
    new NextRequest(
      `http://localhost:3000/api/auth/google/callback?code=code&state=${a.state}`,
      { headers: { cookie: a.header } },
    ),
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body).assertion).toBe(
    "signed-identity",
  );
  expect(result.headers.get("location")).toContain("/google/complete");
  expect(result.cookies.get(a.saved.name)?.maxAge).toBe(0);
  expect(result.headers.get("set-cookie")).not.toContain("signed-identity");
});
