import { it, expect, vi, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseServerConfig } from "../../src/lib/config/schema";
import { POST } from "../../src/app/api/auth/[action]/route";
import { NextRequest } from "next/server";
afterEach(() => vi.unstubAllEnvs());
it("removes retired portal routes, forms and adapters", () => {
  for (const path of [
    "src/app/portal",
    "src/app/(auth)",
    "src/app/api/portal",
    "src/app/api/upload/fileList",
    "src/lib/portal-api.ts",
    "src/lib/server/portal.ts",
    "src/components/RegisterForm",
    "src/components/AuthShell",
  ])
    expect(existsSync(resolve(path)), path).toBe(false);
  expect(readFileSync("src/lib/auth-api.ts", "utf8")).not.toContain(
    "legacyRequest",
  );
});
it("uses only the wx backend configuration", () => {
  const config = parseServerConfig({
    DEPLOYMENT_ENV: "local",
    MEMBER_API_URL: "http://localhost:4000/api/v1",
    API_URL: "http://old.test/api",
  });
  expect(config).not.toHaveProperty("portalApiUrl");
});
it("retired enterprise registration is not a public buyer registration endpoint", async () => {
  vi.stubEnv("DEPLOYMENT_ENV", "test");
  const request = new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: "{}",
  });
  expect(
    (await POST(request, { params: Promise.resolve({ action: "register" }) }))
      .status,
  ).toBe(404);
});
