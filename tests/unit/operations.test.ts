import { it, expect, vi, afterEach } from "vitest";
import { logEvent } from "../../src/lib/server/logger";
import { checkReadiness } from "../../src/lib/server/health";
import { validateProductionEnvironment } from "../../src/lib/config/release";
import { GET as live } from "../../src/app/api/health/live/route";
afterEach(() => vi.unstubAllGlobals());
it("logs only whitelisted non-sensitive fields", () => {
  const output = vi.spyOn(console, "info").mockImplementation(() => {});
  logEvent({
    level: "info",
    name: "request_failed",
    traceId: "bad secret",
    password: "secret",
    body: "private",
  } as never);
  const line = String(output.mock.calls[0][0]);
  expect(line).not.toContain("secret");
  expect(line).not.toContain("private");
  expect(JSON.parse(line)).toMatchObject({ name: "request_failed" });
});
it("readiness fails on missing or unhealthy dependencies but liveness stays up", async () => {
  const config = {
    deploymentEnv: "test" as const,
    siteUrl: "http://localhost:3000",
    trustedOrigins: [],
  };
  expect(await checkReadiness(config)).toBe(false);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("down", { status: 503 })),
  );
  expect(
    await checkReadiness({
      ...config,
      memberApiUrl: "http://localhost:4000/api/v1",
    }),
  ).toBe(false);
  expect((await live()).status).toBe(200);
});
it("release validation requires explicit shared protection evidence", () => {
  expect(validateProductionEnvironment({})).toContain("NEXT_PUBLIC_SITE_URL");
  const env = {
    NEXT_PUBLIC_SITE_URL: "https://site.test",
    MEMBER_API_URL: "https://members.test/api/v1",
    RATE_LIMIT_MODE: "gateway",
  };
  expect(validateProductionEnvironment(env)).toContain(
    "RATE_LIMIT_VERIFICATION_FILE",
  );
  expect(
    validateProductionEnvironment(env, {
      mode: "gateway",
      verifiedAt: new Date().toISOString(),
      evidenceReference: "gateway-rule-reviewed",
    }),
  ).toEqual([]);
});
it("wx-backend alone is enough for new website readiness and release", async () => {
  const fetchMock = vi.fn(async () =>
    Response.json({ code: 200, data: { status: "ok" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(
    await checkReadiness({
      deploymentEnv: "development",
      siteUrl: "http://localhost:3000",
      trustedOrigins: [],
      memberApiUrl: "https://dev.api.shopai.org.cn/api/v1",
    }),
  ).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(
    validateProductionEnvironment(
      {
        NEXT_PUBLIC_SITE_URL: "https://site.test",
        MEMBER_API_URL: "https://prd.api.shopai.org.cn/api/v1",
        RATE_LIMIT_MODE: "gateway",
      },
      {
        mode: "gateway",
        verifiedAt: new Date().toISOString(),
        evidenceReference: "verified",
      },
    ),
  ).toEqual([]);
});
