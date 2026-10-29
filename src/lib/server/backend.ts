import { isBuyerPath } from "./buyer-path";
import "server-only";
import { isCatalogPath } from "../catalog/model";
import { isIP } from "node:net";
import { getServerConfig } from "./config";
import { fetchResponse, requestJson } from "../http/request";
import type { RequestOptions } from "../http/types";
export type SiteAuthPath =
  `/web/site-auth/${"login" | "register" | "register/send-code" | "register/verify-email" | "forgot-password" | "reset-password" | "me" | "me/profile" | "me/avatar" | "me/change-password" | "google/exchange" | "google/pending" | "google/send-code" | "google/complete" | "me/google" | "me/google/send-code" | "me/google/prepare" | "me/google/unlink" | "me/password/set"}`;
export type BackendPath =
  | `/web/buyer/${string}`
  | SiteAuthPath
  | "/regions/tree"
  | `/web/catalog/${string}`
  | "/web/enterprise-applications"
  | "/web/enterprise-applications/options"
  | "/sms/send-code"
  | "/web/auth/login"
  | "/web/auth/forgot-password"
  | "/web/auth/reset-password"
  | "/web/members/me"
  | "/web/members/me/change-password"
  | `/web/files/upload?module=${"enterprise-license" | "enterprise"}`;
function destination(path: BackendPath): string {
  const valid =
    /^(?:\/web\/enterprise-applications(?:\/options)?|\/sms\/send-code|\/web\/auth\/(?:login|forgot-password|reset-password)|\/web\/members\/(?:me|me\/change-password)|\/web\/files\/upload\?module=(?:enterprise-license|enterprise))$/;
  const catalogValid =
    path.startsWith("/web/catalog/") &&
    !path.includes("#") &&
    isCatalogPath(path.slice("/web/catalog/".length).split("?")[0]);
  const siteAuthValid =
    /^\/web\/site-auth\/(?:login|register(?:\/(?:send-code|verify-email))?|forgot-password|reset-password|google\/(?:exchange|pending|send-code|complete)|me(?:\/(?:profile|avatar|change-password|password\/set|google(?:\/(?:send-code|prepare|unlink))?))?)$/.test(
      path,
    );
  if (
    !valid.test(path) &&
    !siteAuthValid &&
    !catalogValid &&
    !isBuyerPath(path) &&
    path !== "/regions/tree"
  )
    throw new Error("Unsupported backend path");
  const base = getServerConfig().memberApiUrl;
  if (!base) throw new Error("Backend is not configured");
  return base + path;
}
function outbound(options: RequestOptions): RequestOptions {
  const headers = new Headers();
  const input = new Headers(options.headers);
  for (const name of [
    "content-type",
    "idempotency-key",
    "x-expected-member-id",
    "authorization",
    "x-trace-id",
    "user-agent",
  ]) {
    const value = input.get(name);
    if (value) headers.set(name, value);
  }
  const { trustProxy } = getServerConfig();
  // Forwarding IPs is explicit: the trusted reverse proxy must overwrite them.
  if (trustProxy && input.has("x-forwarded-for"))
    headers.set("x-forwarded-for", input.get("x-forwarded-for")!);
  if (trustProxy && input.has("x-real-ip")) {
    const ip = input.get("x-real-ip")!;
    if (isIP(ip)) headers.set("x-real-ip", ip);
  }
  return { ...options, headers, redirect: "error", cache: "no-store" };
}
export function backendFetch(
  path: BackendPath,
  options: RequestOptions = {},
): Promise<Response> {
  return Promise.resolve().then(() =>
    fetchResponse(destination(path), outbound(options)),
  );
}
export function backendRequest<T>(
  path: BackendPath,
  options: RequestOptions = {},
): Promise<T> {
  return Promise.resolve().then(() =>
    requestJson<T>(destination(path), outbound(options)),
  );
}
