import { describe, it, expect } from "vitest";
import { parseServerConfig } from "../../src/lib/config/schema";
describe("environment boundaries", () => {
  it("preserves backend prefix and removes trailing slash", () => {
    expect(
      parseServerConfig({ MEMBER_API_URL: "http://localhost:4000/api/v1/" })
        .memberApiUrl,
    ).toBe("http://localhost:4000/api/v1");
  });
  it("never uses an obsolete backend variable for members", () => {
    expect(
      parseServerConfig({ API_URL: "http://localhost:3100/api" }).memberApiUrl,
    ).toBeUndefined();
  });
  it("requires real site configuration for production without exposing values", () => {
    expect(() => parseServerConfig({ DEPLOYMENT_ENV: "production" })).toThrow(
      "NEXT_PUBLIC_SITE_URL",
    );
    expect(() =>
      parseServerConfig({
        MEMBER_API_URL: "https://user:secret@example.com/api/v1",
      }),
    ).toThrow("MEMBER_API_URL");
  });
  it("requires HTTPS in production and rejects invalid trusted origins", () => {
    expect(() =>
      parseServerConfig({
        DEPLOYMENT_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "http://example.com",
      }),
    ).toThrow();
    expect(() =>
      parseServerConfig({ TRUSTED_ORIGINS: "https://example.com/path" }),
    ).toThrow();
  });
});

it("reads proxy, limiter and Google settings from environment configuration", () => {
  const config = parseServerConfig({
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    TRUST_PROXY: "true",
    RATE_LIMIT_MODE: "backend",
    RATE_LIMIT_VERIFICATION_FILE: "/tmp/protection.json",
    DEV_ALLOWED_ORIGINS: "192.168.2.9,dev.example.test",
    GOOGLE_CLIENT_ID: "configured-client.apps.googleusercontent.com",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
  });
  expect(config.trustProxy).toBe(true);
  expect(config.rateLimitMode).toBe("backend");
  expect(config.rateLimitVerificationFile).toBe("/tmp/protection.json");
  expect(config.devAllowedOrigins).toEqual(["192.168.2.9", "dev.example.test"]);
  expect(config.google).toEqual({clientId:"configured-client.apps.googleusercontent.com",redirectUri:"http://localhost:3000/api/auth/google/callback"});
});
it("has no built-in Google client and derives the callback only from the configured site", () => {
  expect(parseServerConfig({}).google).toBeUndefined();
  expect(parseServerConfig({NEXT_PUBLIC_SITE_URL:"https://dev.example.test",GOOGLE_CLIENT_ID:"another.apps.googleusercontent.com"}).google?.redirectUri).toBe("https://dev.example.test/api/auth/google/callback");
});
it.each([
  {TRUST_PROXY:"yes"},
  {RATE_LIMIT_MODE:"something"},
  {GOOGLE_CLIENT_ID:"invalid"},
  {DEV_ALLOWED_ORIGINS:"https://evil.test/path"},
  {GOOGLE_CLIENT_ID:"client.apps.googleusercontent.com",GOOGLE_REDIRECT_URI:"https://evil.test/api/auth/google/callback"},
  {GOOGLE_CLIENT_ID:"client.apps.googleusercontent.com",GOOGLE_REDIRECT_URI:"http://localhost:3000/other"},
])("rejects malformed or unsafe environment values %j", settings => {
  expect(() => parseServerConfig(settings)).toThrow();
});
