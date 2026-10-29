import "server-only";
import { NextRequest } from "next/server";
import { apiJson } from "./api-response";
import { backendFetch, backendRequest, type SiteAuthPath } from "./backend";
import {
  guardMutation,
  readJsonBody,
  mutationFailure,
  clientIp,
} from "./mutation";
import { resolveSession } from "./session";
import { siteAuthResponse } from "./site-auth-proxy";
import { SecurityError } from "../security/origin";
import { safeReturnTo } from "../auth/return-to";
import { MEMBER_TOKEN_COOKIE, memberTokenCookieOptions } from "../auth-token";
import {
  GOOGLE_BINDING,
  GOOGLE_PENDING,
  googleCookieOptions,
  sessionFingerprint,
} from "./google-authorization";
export type GoogleAction =
  | "pending"
  | "send-code"
  | "complete"
  | "status"
  | "security-code"
  | "prepare"
  | "unlink"
  | "set-password";
export async function proxyGoogle(request: NextRequest, action: GoogleAction) {
  try {
    if (action !== "status") await guardMutation(request);
    const body = action === "status" ? {} : await readJsonBody(request);
    if (!body) throw new SecurityError(400, "invalid_input");
    const token = request.cookies.get(MEMBER_TOKEN_COOKIE)?.value;
    const protectedAction = [
      "status",
      "security-code",
      "prepare",
      "unlink",
      "set-password",
    ].includes(action);
    let memberId: string | undefined;
    if (protectedAction) {
      const session = await resolveSession(token, (value) =>
        backendRequest("/web/site-auth/me", {
          headers: { authorization: `Bearer ${value}` },
        }),
      );
      if (session.status !== "authenticated")
        throw new SecurityError(
          session.status === "unavailable" ? 503 : 401,
          "session_expired",
        );
      memberId = session.member.id;
      if (
        action !== "status" &&
        request.headers.get("x-expected-member-id") !== memberId
      )
        throw new SecurityError(401, "session_expired");
    }
    const text = (key: string, min = 1, max = 128, optional = false) => {
      const value = body[key];
      if (optional && (value === undefined || value === "")) return undefined;
      if (typeof value !== "string" || value.length < min || value.length > max)
        throw new SecurityError(400, "invalid_input");
      return value;
    };
    const code = () => {
      const value = text("code", 6, 6, true);
      if (value && !/^\d{6}$/.test(value))
        throw new SecurityError(400, "code_invalid");
      return value;
    };
    const locale = body.locale === "en" ? "en" : "zh";
    let input: Record<string, unknown> = {};
    let path: string;
    let pendingReturnTo = "/buyer";
    let pendingId: string | undefined;
    if (!protectedAction) {
      let pending;
      try {
        pending = JSON.parse(
          request.cookies.get(GOOGLE_PENDING)?.value || "null",
        );
      } catch {
        /* invalid cookie */
      }
      if (
        !pending ||
        typeof pending.token !== "string" ||
        pending.fingerprint !== sessionFingerprint(token)
      )
        throw new SecurityError(401, "google_pending_expired");
      pendingId = sessionFingerprint(pending.token);
      if (action !== "pending" && body.pendingId !== pendingId)
        throw new SecurityError(409, "google_pending_expired");
      pendingReturnTo = safeReturnTo(pending.returnTo);
      input = { pendingToken: pending.token };
      path = `google/${action}`;
      if (action !== "pending") input.locale = locale;
      if (action === "complete") {
        Object.assign(input, {
          nickname: text("nickname", 0, 32, true),
          password: text("password", 1, 128, true),
          code: code(),
          acceptedTerms: body.acceptedTerms === true,
          policyVersion: text("policyVersion", 1, 32, true),
        });
      }
    } else {
      path = {
        status: "me/google",
        "security-code": "me/google/send-code",
        prepare: "me/google/prepare",
        unlink: "me/google/unlink",
        "set-password": "me/password/set",
      }[
        action as
          | "status"
          | "security-code"
          | "prepare"
          | "unlink"
          | "set-password"
      ];
      if (action === "security-code") {
        if (!["link", "unlink", "set-password"].includes(String(body.purpose)))
          throw new SecurityError(400, "invalid_input");
        input = { purpose: body.purpose, locale };
      } else if (action === "prepare" || action === "unlink") {
        input = {
          currentPassword: text("currentPassword", 1, 128, true),
          code: code(),
        };
        if (!input.currentPassword && !input.code)
          throw new SecurityError(400, "invalid_input");
      } else if (action === "set-password") {
        input = { code: code(), newPassword: text("newPassword", 8) };
        if (!input.code) throw new SecurityError(400, "code_invalid");
      }
    }
    const response = await backendFetch(
      `/web/site-auth/${path}` as SiteAuthPath,
      {
        method: action === "status" ? "GET" : "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": clientIp(request),
          "x-trace-id": request.headers.get("x-trace-id") || "",
          ...(protectedAction
            ? {
                authorization: `Bearer ${token}`,
                "x-expected-member-id": memberId!,
              }
            : {}),
        },
        ...(action === "status" ? {} : { body: JSON.stringify(input) }),
      },
    );
    if (action === "complete") {
      const result = await siteAuthResponse(request, response, "login");
      if (result.status !== 200) return result;
      const payload = await result.json();
      const next = apiJson(request, {
        ...payload,
        data: { ...payload.data, returnTo: pendingReturnTo },
      });
      for (const cookie of result.cookies.getAll()) next.cookies.set(cookie);
      next.cookies.set(GOOGLE_PENDING, "", googleCookieOptions(0));
      return next;
    }
    if (action === "prepare") {
      const raw = await response.json().catch(() => null);
      if (
        response.ok &&
        Number(raw?.code) === 200 &&
        typeof raw?.data?.bindingGrant === "string"
      ) {
        const result = apiJson(request, { code: 200, data: { ready: true } });
        result.cookies.set(
          GOOGLE_BINDING,
          JSON.stringify({
            grant: raw.data.bindingGrant,
            memberId,
            fingerprint: sessionFingerprint(token),
            expiresAt: Date.now() + 300000,
          }),
          googleCookieOptions(300),
        );
        return result;
      }
      return siteAuthResponse(
        request,
        Response.json(raw, { status: response.status }),
        "profile",
      );
    }
    const result = await siteAuthResponse(request, response, "profile");
    if (action === "pending" && result.status === 200) {
      const payload = await result.json();
      return apiJson(request, {
        ...payload,
        data: { ...payload.data, pendingId },
      });
    }
    if (
      result.status === 200 &&
      (action === "unlink" || action === "set-password")
    )
      result.cookies.set(MEMBER_TOKEN_COOKIE, "", memberTokenCookieOptions(0));
    return result;
  } catch (error) {
    return mutationFailure(error, request);
  }
}
