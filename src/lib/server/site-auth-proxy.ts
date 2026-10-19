import "server-only";
import { NextRequest } from "next/server";
import { apiJson } from "./api-response";
import { backendFetch, type SiteAuthPath } from "./backend";
import {
  clientIp,
  guardMutation,
  readJsonBody,
  mutationFailure,
} from "./mutation";
import {
  MEMBER_TOKEN_COOKIE,
  MEMBER_TOKEN_MAX_AGE,
  memberTokenCookieOptions,
} from "../auth-token";
import { SecurityError } from "../security/origin";
const paths = {
  login: "login",
  register: "register",
  sendCode: "register/send-code",
  verifyEmail: "register/verify-email",
  forgot: "forgot-password",
  reset: "reset-password",
  password: "me/change-password",
  profile: "me/profile",
} as const;
export type SiteAuthAction = keyof typeof paths;
function required(
  body: Record<string, unknown>,
  key: string,
  min = 1,
  max = 128,
) {
  const value = body[key];
  if (typeof value !== "string" || value.length < min || value.length > max)
    throw new SecurityError(400, "invalid_input");
  return value;
}
function payload(
  action: SiteAuthAction,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const email = () => {
    const value = required(body, "email", 3, 128).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      throw new SecurityError(400, "invalid_input");
    return value;
  };
  const locale = () => (body.locale === "en" ? "en" : "zh");
  switch (action) {
    case "login":
      return { email: email(), password: required(body, "password") };
    case "sendCode":
      if (body.acceptedTerms !== true)
        throw new SecurityError(400, "terms_required");
      return { email: email(), locale: locale(), acceptedTerms: true, policyVersion: required(body, "policyVersion", 1, 32) };
    case "verifyEmail": {
      const code = required(body, "code", 6, 6);
      if (!/^\d{6}$/.test(code)) throw new SecurityError(400, "code_invalid");
      return { email: email(), code };
    }
    case "register":
      return {
        registrationToken: required(body, "registrationToken", 43, 43),
        password: required(body, "password", 8),
      };
    case "forgot":
      return { email: email(), locale: locale() };
    case "reset":
      return {
        token: required(body, "token", 43, 43),
        newPassword: required(body, "newPassword", 8),
      };
    case "password":
      return {
        currentPassword: required(body, "currentPassword"),
        newPassword: required(body, "newPassword", 8),
      };
    case "profile":
      return { nickname: required(body, "nickname", 0, 32) };
  }
}
export async function siteAuthResponse(
  request: NextRequest,
  response: Response,
  action: SiteAuthAction | "avatar",
) {
  const raw: unknown = await response.json().catch(() => null);
  if (!raw || typeof raw !== "object")
    return apiJson(
      request,
      { errorKey: "service_unavailable" },
      { status: 502 },
    );
  const envelope = raw as {
    code?: number;
    data?: Record<string, unknown>;
    errorKey?: string;
  };
  if (
    !response.ok ||
    (envelope.code != null && Number(envelope.code) !== 200)
  ) {
    return apiJson(
      request,
      {
        code: envelope.code ?? response.status,
        errorKey: envelope.data?.errorKey ?? envelope.errorKey,
      },
      { status: response.ok ? 400 : response.status },
    );
  }
  const data = envelope.data ?? (raw as Record<string, unknown>);
  const result = { code: 200, data: { ...data } };
  let cookie: { value: string; maxAge: number } | null = null;
  if (action === "login" || action === "register") {
    if (typeof data.accessToken !== "string" || !data.accessToken)
      return apiJson(
        request,
        { errorKey: "service_unavailable" },
        { status: 502 },
      );
    const expires = Number(data.expiresIn);
    cookie = {
      value: data.accessToken,
      maxAge:
        Number.isFinite(expires) && expires > 0
          ? Math.min(Math.floor(expires), MEMBER_TOKEN_MAX_AGE)
          : MEMBER_TOKEN_MAX_AGE,
    };
    result.data = {
      expiresIn: cookie.maxAge,
      mustChangePassword: data.mustChangePassword === true,
      member: data.member,
    };
  } else if (action === "reset" || action === "password")
    cookie = { value: "", maxAge: 0 };
  const next = apiJson(request, result);
  if (cookie)
    next.cookies.set(
      MEMBER_TOKEN_COOKIE,
      cookie.value,
      memberTokenCookieOptions(cookie.maxAge),
    );
  return next;
}
export async function proxySiteAuth(
  request: NextRequest,
  action: SiteAuthAction,
) {
  try {
    await guardMutation(request);
    const body = await readJsonBody(request);
    if (!body) throw new SecurityError(400, "invalid_input");
    const input = payload(action, body);
    const token = request.cookies.get(MEMBER_TOKEN_COOKIE)?.value;
    if ((action === "password" || action === "profile") && !token)
      throw new SecurityError(401, "session_expired");
    const response = await backendFetch(
      `/web/site-auth/${paths[action]}` as SiteAuthPath,
      {
        method: action === "profile" ? "PUT" : "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": clientIp(request),
          "x-trace-id": request.headers.get("x-trace-id") || "",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      },
    );
    return siteAuthResponse(request, response, action);
  } catch (error) {
    return mutationFailure(error, request);
  }
}
