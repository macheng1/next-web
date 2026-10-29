import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerConfig } from "./config";
import { backendFetch, backendRequest } from "./backend";
import { resolveSession } from "./session";
import { apiJson } from "./api-response";
import { clientIp } from "./mutation";
import { siteAuthResponse } from "./site-auth-proxy";
import { MEMBER_TOKEN_COOKIE } from "../auth-token";
import { safeReturnTo } from "../auth/return-to";
export const GOOGLE_PENDING = "google_pending";
export const GOOGLE_BINDING = "google_binding";
const CALLBACK_PATH = "/api/auth/google/callback";
const ATTEMPT_SECONDS = 600;
interface Attempt {
  state: string;
  verifier: string;
  nonce: string;
  returnTo: string;
  createdAt: number;
  fingerprint: string;
  memberId?: string;
  bindingGrant?: string;
}
export const sessionFingerprint = (token?: string) =>
  createHash("sha256")
    .update(token || "anonymous")
    .digest("hex");
export function googleCookieOptions(maxAge: number, path = "/api/auth/google") {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(getServerConfig().siteUrl).protocol === "https:",
    path,
    maxAge,
  };
}
function protect(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export async function startGoogleAuthorization(request: NextRequest) {
  const { siteUrl, google } = getServerConfig();
  if (!google)
    return protect(
      apiJson(request, { errorKey: "google_unavailable" }, { status: 503 }),
    );
  const token = request.cookies.get(MEMBER_TOKEN_COOKIE)?.value;
  const attempt: Attempt = {
    state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    returnTo: safeReturnTo(request.nextUrl.searchParams.get("returnTo")),
    createdAt: Date.now(),
    fingerprint: sessionFingerprint(token),
  };
  if (request.nextUrl.searchParams.get("intent") === "link") {
    try {
      const binding = JSON.parse(
        request.cookies.get(GOOGLE_BINDING)?.value || "null",
      );
      const session = await resolveSession(token, (value) =>
        backendRequest("/web/site-auth/me", {
          headers: { authorization: `Bearer ${value}` },
        }),
      );
      if (
        !binding ||
        binding.fingerprint !== attempt.fingerprint ||
        binding.expiresAt <= Date.now() ||
        session.status !== "authenticated" ||
        binding.memberId !== session.member.id
      )
        throw new Error("invalid binding");
      attempt.bindingGrant = binding.grant;
      attempt.memberId = binding.memberId;
      attempt.returnTo = "/buyer/settings";
    } catch {
      return protect(
        NextResponse.redirect(
          new URL("/buyer/settings?reason=google-invalid", siteUrl),
          303,
        ),
      );
    }
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: google.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: attempt.state,
    nonce: attempt.nonce,
    code_challenge: createHash("sha256")
      .update(attempt.verifier)
      .digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
    hl: request.nextUrl.searchParams.get("locale") === "zh" ? "zh-CN" : "en",
  }).toString();
  const response = protect(NextResponse.redirect(url, 303));
  response.cookies.set(
    `google_attempt_${attempt.state}`,
    JSON.stringify(attempt),
    googleCookieOptions(ATTEMPT_SECONDS, CALLBACK_PATH),
  );
  response.cookies.set(GOOGLE_BINDING, "", googleCookieOptions(0));
  response.cookies.set(GOOGLE_PENDING, "", googleCookieOptions(0));
  return response;
}
export async function finishGoogleAuthorization(request: NextRequest) {
  const { siteUrl, google } = getServerConfig();
  let destination = new URL("/login?reason=google-invalid", siteUrl);
  const state = request.nextUrl.searchParams.get("state");
  const cookieName =
    state && /^[A-Za-z0-9_-]{43}$/.test(state)
      ? `google_attempt_${state}`
      : null;
  let sessionResponse: NextResponse | undefined;
  let pending: string | undefined;
  try {
    const attempt: Attempt = JSON.parse(
      cookieName ? request.cookies.get(cookieName)?.value || "null" : "null",
    );
    const token = request.cookies.get(MEMBER_TOKEN_COOKIE)?.value;
    if (
      !google ||
      !attempt ||
      !/^[A-Za-z0-9_-]{43}$/.test(attempt.state) ||
      !state ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(attempt.state)) ||
      !/^[A-Za-z0-9_-]{43}$/.test(attempt.nonce) ||
      !/^[A-Za-z0-9_-]{43}$/.test(attempt.verifier) ||
      !Number.isFinite(attempt.createdAt) ||
      attempt.createdAt > Date.now() ||
      Date.now() - attempt.createdAt >= ATTEMPT_SECONDS * 1000 ||
      attempt.fingerprint !== sessionFingerprint(token)
    )
      throw new Error("invalid attempt");
    if (attempt.bindingGrant)
      destination = new URL("/buyer/settings?reason=google-invalid", siteUrl);
    else
      destination.searchParams.set("returnTo", safeReturnTo(attempt.returnTo));
    if (request.nextUrl.searchParams.get("error") === "access_denied")
      destination.searchParams.set("reason", "google-cancelled");
    else {
      const code = request.nextUrl.searchParams.get("code");
      if (
        !code ||
        code.length > 4096 ||
        request.nextUrl.searchParams.has("error")
      )
        throw new Error("invalid code");
      const response = await backendFetch("/web/site-auth/google/exchange", {
        // Allow both bounded Google token and signing-key requests to finish.
        timeoutMs: 20_000,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": clientIp(request),
          "x-trace-id": request.headers.get("x-trace-id") || "",
          ...(attempt.bindingGrant && token
            ? {
                authorization: `Bearer ${token}`,
                "x-expected-member-id": attempt.memberId!,
              }
            : {}),
        },
        body: JSON.stringify({
          code,
          codeVerifier: attempt.verifier,
          nonce: attempt.nonce,
          redirectUri: google.redirectUri,
          ...(attempt.bindingGrant
            ? { bindingGrant: attempt.bindingGrant }
            : {}),
        }),
      });
      const raw = await response.json();
      if (!response.ok || Number(raw.code) !== 200 || !raw.data)
        throw new Error("exchange failed");
      const data = raw.data;
      if (data.kind === "session" && !attempt.bindingGrant) {
        sessionResponse = await siteAuthResponse(
          request,
          Response.json({ code: 200, data }),
          "login",
        );
        if (sessionResponse.status !== 200) throw new Error("invalid session");
        destination = new URL("/google/success", siteUrl);
        destination.searchParams.set(
          "returnTo",
          data.mustChangePassword
            ? "/account/password"
            : safeReturnTo(attempt.returnTo),
        );
      } else if (
        data.kind === "pending" &&
        !attempt.bindingGrant &&
        typeof data.pendingToken === "string" &&
        data.pendingToken.length <= 4096
      ) {
        pending = JSON.stringify({
          token: data.pendingToken,
          returnTo: safeReturnTo(attempt.returnTo),
          fingerprint: attempt.fingerprint,
        });
        destination = new URL("/google/complete", siteUrl);
      } else if (data.kind === "linked" && attempt.bindingGrant) {
        sessionResponse = await siteAuthResponse(
          request,
          Response.json({ code: 200, data }),
          "login",
        );
        if (sessionResponse.status !== 200)
          throw new Error("invalid replacement session");
        destination = new URL("/google/success", siteUrl);
        destination.searchParams.set(
          "returnTo",
          "/buyer/settings?reason=google-linked",
        );
      } else throw new Error("invalid result");
    }
  } catch {
    /* Codes and grants are deliberately excluded from redirects and logs. */
  }
  const result = protect(NextResponse.redirect(destination, 303));
  if (cookieName)
    result.cookies.set(cookieName, "", googleCookieOptions(0, CALLBACK_PATH));
  if (sessionResponse)
    for (const cookie of sessionResponse.cookies.getAll())
      result.cookies.set(cookie);
  if (pending)
    result.cookies.set(GOOGLE_PENDING, pending, googleCookieOptions(600));
  return result;
}
