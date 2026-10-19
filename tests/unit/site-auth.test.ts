import { expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../src/app/api/auth/register/route";
import { POST as sendCode } from "../../src/app/api/auth/register/send-code/route";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function request(path: string, body: unknown) {
  vi.stubEnv("DEPLOYMENT_ENV", "test");
  vi.stubEnv("MEMBER_API_URL", "http://localhost:4000/api/v1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  return new NextRequest("http://localhost:3000/api/auth/" + path, {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
it("registers using a verified grant and never exposes the access token", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        code: 200,
        data: {
          accessToken: "secret",
          expiresIn: 28800,
          member: {
            id: "buyer",
            email: "buyer@test.com",
            memberType: "personal",
          },
          mustChangePassword: false,
        },
      }),
    ),
  );
  const result = await POST(
    request("register", {
      registrationToken: "a".repeat(43),
      password: "StrongPass123!",
    }),
  );
  expect(result.status).toBe(200);
  expect(await result.text()).not.toContain("secret");
  expect(result.headers.get("set-cookie")).toContain("public_web_token=secret");
  expect(result.headers.get("set-cookie")).toContain("HttpOnly");
});
it("refuses verification mail without explicit agreement", async () => {
  const result = await sendCode(
    request("register/send-code", {
      email: "buyer@test.com",
      acceptedTerms: false,
      locale: "en",
    }),
  );
  expect(result.status).toBe(400);
});
it("does not treat a backend business error as registration success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        code: 10003,
        data: { errorKey: "registration_expired" },
      }),
    ),
  );
  const result = await POST(
    request("register", {
      registrationToken: "a".repeat(43),
      password: "StrongPass123!",
    }),
  );
  expect(result.status).toBe(400);
  expect((await result.json()).errorKey).toBe("registration_expired");
  expect(result.headers.get("set-cookie")).toBeNull();
});
