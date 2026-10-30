import { generateKeyPairSync, verify } from "node:crypto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const { verifyToken } = vi.hoisted(() => ({ verifyToken: vi.fn() }));
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifySignedJwtWithCertsAsync = verifyToken;
  },
}));
import { exchangeGoogleOnVercel } from "../../src/lib/server/google-vercel-identity";
const pair = generateKeyPairSync("ed25519");
const input = {
  code: "code",
  codeVerifier: "v".repeat(43),
  nonce: "n".repeat(43),
  redirectUri: "https://www.pinmalink.com/api/auth/google/callback",
  bindingGrant: "grant",
};
const clientId = "test.apps.googleusercontent.com";
beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "private-secret");
  vi.stubEnv(
    "GOOGLE_ASSERTION_PRIVATE_KEY",
    pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  );
  verifyToken.mockResolvedValue({
    getPayload: () => ({
      sub: "sub",
      email: "test@gmail.com",
      email_verified: true,
      nonce: input.nonce,
      aud: clientId,
      iss: "https://accounts.google.com",
      exp: Math.floor(Date.now() / 1000) + 300,
      name: "Test",
    }),
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("signs only verified identity and calls fixed Google endpoints with bounded requests", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id_token: "private-token" }))
    .mockResolvedValueOnce(Response.json({ kid: "cert" }));
  vi.stubGlobal("fetch", fetch);
  const result = await exchangeGoogleOnVercel(input, {
    clientId,
    redirectUri: input.redirectUri,
  });
  const [h, b, s] = result.split(".");
  expect(
    verify(
      null,
      Buffer.from(`${h}.${b}`),
      pair.publicKey,
      Buffer.from(s, "base64url"),
    ),
  ).toBe(true);
  const body = JSON.parse(Buffer.from(b, "base64url").toString());
  expect(body.identity.subject).toBe("sub");
  expect(body.exp - body.iat).toBe(60);
  expect(JSON.stringify(body)).not.toContain("private-secret");
  expect(fetch.mock.calls.map((c) => c[0])).toEqual([
    "https://oauth2.googleapis.com/token",
    "https://www.googleapis.com/oauth2/v1/certs",
  ]);
  expect(fetch.mock.calls[0][1].redirect).toBe("error");
});
it("rejects nonce mismatch, unverified email and SDK verification failure", async () => {
  for (const claims of [
    { nonce: "wrong", email_verified: true },
    { nonce: input.nonce, email_verified: false },
  ]) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ id_token: "token" })),
    );
    verifyToken.mockResolvedValue({
      getPayload: () => ({
        ...claims,
        sub: "sub",
        email: "test@gmail.com",
        aud: clientId,
        iss: "https://accounts.google.com",
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
    });
    await expect(
      exchangeGoogleOnVercel(input, {
        clientId,
        redirectUri: input.redirectUri,
      }),
    ).rejects.toThrow();
  }
  verifyToken.mockRejectedValue(Error("sensitive token"));
  await expect(
    exchangeGoogleOnVercel(input, { clientId, redirectUri: input.redirectUri }),
  ).rejects.toThrow("Google identity verification failed");
});
it("does not send credentials when signing configuration is missing", async () => {
  vi.stubEnv("GOOGLE_ASSERTION_PRIVATE_KEY", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    exchangeGoogleOnVercel(input, { clientId, redirectUri: input.redirectUri }),
  ).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});

it("does not create an assertion after Google network or HTTP failure", async () => {
  for (const fetch of [vi.fn().mockRejectedValue(new Error("secret-network-detail")), vi.fn().mockResolvedValue(new Response("denied", {status:503}))]) {
    vi.stubGlobal("fetch", fetch);
    await expect(exchangeGoogleOnVercel(input, {clientId, redirectUri:input.redirectUri})).rejects.toThrow("Google identity verification failed");
  }
});
