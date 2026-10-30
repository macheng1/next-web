import "server-only";
import { createHash, createPrivateKey, randomUUID, sign } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
interface ExchangeContext {
  code: string;
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
  bindingGrant?: string;
}
/** Server-to-server credential; never returned to browser or written to logs. */
export async function exchangeGoogleOnVercel(
  input: ExchangeContext,
  google: { clientId: string; redirectUri: string },
): Promise<string> {
  try {
    const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const pem = process.env.GOOGLE_ASSERTION_PRIVATE_KEY?.trim();
    if (!secret || !pem || input.redirectUri !== google.redirectUri)
      throw Error();
    const key = createPrivateKey(pem.replace(/\\n/g, "\n"));
    if (key.asymmetricKeyType !== "ed25519") throw Error();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams({
        client_id: google.clientId,
        client_secret: secret,
        code: input.code,
        code_verifier: input.codeVerifier,
        redirect_uri: google.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw Error();
    const tokens = await response.json();
    if (typeof tokens.id_token !== "string" || tokens.id_token.length > 16384)
      throw Error();
    const certResponse = await fetch(
      "https://www.googleapis.com/oauth2/v1/certs",
      {
        signal: AbortSignal.timeout(8000),
        redirect: "error",
        cache: "no-store",
      },
    );
    if (!certResponse.ok) throw Error();
    const ticket = await new OAuth2Client({
      clientId: google.clientId,
    }).verifySignedJwtWithCertsAsync(
      tokens.id_token,
      await certResponse.json(),
      google.clientId,
      ["accounts.google.com", "https://accounts.google.com"],
    );
    const claims = ticket.getPayload();
    if (
      !claims ||
      claims.aud !== google.clientId ||
      !["accounts.google.com", "https://accounts.google.com"].includes(
        claims.iss,
      ) ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000 ||
      claims.nonce !== input.nonce ||
      claims.email_verified !== true ||
      typeof claims.sub !== "string" ||
      !claims.sub.trim() ||
      claims.sub.length > 255 ||
      typeof claims.email !== "string" ||
      claims.email.length > 128 ||
      !/^\S+@[^\s@]+\.[^\s@]+$/.test(claims.email)
    )
      throw Error();
    const email = claims.email.trim().toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: "EdDSA", typ: "manulink-google+jwt" }),
    ).toString("base64url");
    const body = Buffer.from(
      JSON.stringify({
        iss: "manulink:next-web",
        aud: "manulink:google-exchange",
        iat: now,
        exp: now + 60,
        jti: randomUUID(),
        clientId: google.clientId,
        context: createHash("sha256")
          .update(
            JSON.stringify([
              input.code,
              input.codeVerifier,
              input.nonce,
              input.redirectUri,
              input.bindingGrant || "",
            ]),
          )
          .digest("hex"),
        identity: {
          subject: claims.sub,
          email,
          nickname:
            typeof claims.name === "string"
              ? claims.name.trim().slice(0, 64)
              : "",
          emailAuthoritative:
            email.split("@")[1] === "gmail.com" ||
            (typeof claims.hd === "string" && !!claims.hd.trim()),
        },
      }),
    ).toString("base64url");
    const data = `${header}.${body}`;
    return `${data}.${sign(null, Buffer.from(data), key).toString("base64url")}`;
  } catch {
    // SDK and network errors can contain client secrets or Google tokens.
    throw new Error("Google identity verification failed");
  }
}
