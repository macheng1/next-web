import type { Locale } from "./i18n/locale";
import { signalSessionChange } from "./auth/session-events";
import { requestJson } from "./http/request";
import type { RequestOptions } from "./http/types";
import type { SessionResult, WebMember } from "./server/session";
export interface LoginInput {
  email: string;
  password: string;
}
export interface LoginResult {
  expiresIn: number;
  mustChangePassword: boolean;
  member: Pick<WebMember, "id" | "email" | "memberType"> &
    Partial<Pick<WebMember, "nickname" | "avatarUrl">>;
}
function submit<T>(
  action: string,
  input: object,
  options: RequestOptions = {},
) {
  return requestJson<T>(`/api/auth/${action}`, {
    ...options,
    method: "POST",
    headers: {
      ...Object.fromEntries(new Headers(options.headers)),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}
export async function login(input: LoginInput, options?: RequestOptions) {
  const result = await submit<LoginResult>("login", input, options);
  signalSessionChange();
  return result;
}
export function requestPasswordReset(email: string, locale: Locale, options?: RequestOptions) {
  return submit<{ message: string }>(
    "forgot-password",
    {
      email,
      locale,
    },
    options,
  );
}
export function resetPassword(
  input: { token: string; newPassword: string },
  options?: RequestOptions,
) {
  return submit<{ message: string }>("reset-password", input, options);
}
export function changePassword(
  input: { currentPassword: string; newPassword: string },
  options?: RequestOptions,
) {
  return submit<{ message: string }>("change-password", input, options);
}
export async function logout() {
  const result = await requestJson<void>("/api/auth/logout", {
    method: "POST",
  });
  signalSessionChange();
  return result;
}
export function sendRegistrationCode(email: string, locale: "zh" | "en", policyVersion: string) {
  return submit<{ retryAfter: number }>("register/send-code", {
    email,
    locale,
    acceptedTerms: true,
    policyVersion,
  });
}
export function verifyRegistrationEmail(email: string, code: string) {
  return submit<{ registrationToken: string; expiresIn: number }>(
    "register/verify-email",
    { email, code },
  );
}
export async function register(input: {
  registrationToken: string;
  password: string;
}) {
  const result = await submit<LoginResult>("register", input);
  signalSessionChange();
  return result;
}
export function updateProfile(nickname: string) {
  return requestJson<WebMember>("/api/auth/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
}
export function uploadAvatar(file: File) {
  const body = new FormData();
  body.set("file", file);
  return requestJson<WebMember>("/api/auth/avatar", { method: "POST", body });
}

export function checkSession() {
  return requestJson<SessionResult>("/api/auth/me?optional=1", {
    cache: "no-store",
  });
}
