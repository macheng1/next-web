import "server-only";
import { getServerConfig } from "./config";
import { fetchResponse, requestJson } from "../http/request";
import type { RequestOptions } from "../http/types";
export type BackendPath =
  | "/web/auth/login"
  | "/web/auth/forgot-password"
  | "/web/auth/reset-password"
  | "/web/members/register"
  | "/web/members/me"
  | "/web/members/me/change-password"
  | "/sms/send-code"
  | `/web/files/upload?module=${"enterprise-license" | "enterprise"}`
  | "/upload/public/fileList"
  | `/portal/${string}/init`
  | `/portal/${string}/products/${string}`
  | `/portal/${string}/inquiry`;
function destination(backend: "portal" | "member", path: BackendPath): string {
  const valid =
    backend === "member"
      ? /^(?:\/web\/auth\/(?:login|forgot-password|reset-password)|\/web\/members\/(?:register|me|me\/change-password)|\/sms\/send-code|\/web\/files\/upload\?module=(?:enterprise-license|enterprise))$/
      : /^(?:\/upload\/public\/fileList|\/portal\/[A-Za-z0-9._-]+\/(?:init|inquiry|products\/[A-Za-z0-9_-]+))$/;
  if (!valid.test(path)) throw new Error("Unsupported backend path");
  const config = getServerConfig();
  const base = backend === "member" ? config.memberApiUrl : config.portalApiUrl;
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
  return { ...options, headers, redirect: "error", cache: "no-store" };
}
export function backendFetch(
  backend: "portal" | "member",
  path: BackendPath,
  options: RequestOptions = {},
): Promise<Response> {
  return Promise.resolve().then(() =>
    fetchResponse(destination(backend, path), outbound(options)),
  );
}
export function backendRequest<T>(
  backend: "portal" | "member",
  path: BackendPath,
  options: RequestOptions = {},
): Promise<T> {
  return Promise.resolve().then(() =>
    requestJson<T>(destination(backend, path), outbound(options)),
  );
}
