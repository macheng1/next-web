import { requestJson } from "./http/request";
import type { RequestOptions } from "./http/types";
import type { WebMember } from "./server/session";
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
export function login(input: LoginInput, options?: RequestOptions) {
  return submit<LoginResult>("login", input, options);
}
export function requestPasswordReset(email: string, options?: RequestOptions) {
  return submit<{ message: string }>("forgot-password", { email }, options);
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
export function logout() {
  return requestJson<void>("/api/auth/logout", { method: "POST" });
}
export function currentMember() {
  return requestJson<WebMember>("/api/auth/me", { cache: "no-store" });
}
