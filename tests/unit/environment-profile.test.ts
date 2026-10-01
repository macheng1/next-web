import { it, expect } from "vitest";
import { resolveEnvironmentProfile } from "../../src/lib/config/profile";
it("separates local deployment from remote development and preserves wx-backend prefixes", () => {
  const env = resolveEnvironmentProfile(
    "local",
    "MEMBER_API_URL=http://localhost:4000/api/v1\nNEXT_PUBLIC_SITE_URL=http://localhost:3000",
    {},
  );
  expect(env.DEPLOYMENT_ENV).toBe("local");
  expect(env.MEMBER_API_URL).toBe("http://localhost:4000/api/v1");
  expect(env.NEXT_DIST_DIR).toBe(".next-local");
});
it("does not fall back to a local site for incomplete remote profiles", () => {
  expect(() =>
    resolveEnvironmentProfile(
      "development",
      "MEMBER_API_URL=https://dev.api.shopai.org.cn/api/v1",
      {},
    ),
  ).toThrow("NEXT_PUBLIC_SITE_URL");
});
it("shell values override profiles but cannot change environment identity or inject NODE_ENV", () => {
  const profile =
    "MEMBER_API_URL=https://dev.api.shopai.org.cn/api/v1\nNEXT_PUBLIC_SITE_URL=https://web.test";
  expect(
    resolveEnvironmentProfile("development", profile, {
      MEMBER_API_URL: "https://override.test/api/v1",
    }).MEMBER_API_URL,
  ).toBe("https://override.test/api/v1");
  expect(() =>
    resolveEnvironmentProfile("development", profile + "\nNODE_ENV=local", {}),
  ).toThrow("NODE_ENV");
  expect(() =>
    resolveEnvironmentProfile(
      "development",
      profile + "\nDEPLOYMENT_ENV=production",
      {},
    ),
  ).toThrow("DEPLOYMENT_ENV");
});
it("requires HTTPS and distinct build directories for production", () => {
  const profile =
    "MEMBER_API_URL=https://prd.api.shopai.org.cn/api/v1\nNEXT_PUBLIC_SITE_URL=https://web.test";
  expect(
    resolveEnvironmentProfile("production", profile, {}).NEXT_DIST_DIR,
  ).toBe(".next-production");
  expect(() =>
    resolveEnvironmentProfile("production", profile, {
      MEMBER_API_URL: "http://localhost:4000/api/v1",
    }),
  ).toThrow("MEMBER_API_URL");
});
