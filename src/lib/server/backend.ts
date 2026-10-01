import "server-only";
import { isIP } from "node:net";
import { getServerConfig } from "./config";
import { fetchResponse, requestJson } from "../http/request";
import type { RequestOptions } from "../http/types";
export type BackendPath =
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
  if (!valid.test(path)) throw new Error("Unsupported backend path");
  const base = getServerConfig().memberApiUrl;
  if (!base) throw new Error("Backend is not configured");
  return base + path;
}
function outbound(options: RequestOptions): RequestOptions {
  const headers = new Headers();
  const input = new Headers(options.headers);
  for (const name of [
    "content-type",
    "authorization",
    "x-trace-id",
    "user-agent",
  ]) {
    const value = input.get(name);
    if (value) headers.set(name, value);
  }
  // Forwarding IPs is explicit: the trusted reverse proxy must overwrite them.
  if (process.env.TRUST_PROXY === "true" && input.has("x-forwarded-for"))
    headers.set("x-forwarded-for", input.get("x-forwarded-for")!);
  if (process.env.TRUST_PROXY === "true" && input.has("x-real-ip")) {
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
