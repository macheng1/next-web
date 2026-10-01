import { requestTraceId } from "../api-envelope";
import "server-only";
import { NextResponse } from "next/server";
import { logEvent } from "./logger";
import { HttpError } from "../http/types";
import { apiJson } from "./api-response";
import { getServerConfig } from "./config";
import { assertTrustedOrigin, SecurityError } from "../security/origin";
import { MemoryRateLimiter } from "../security/rate-limit";
const limiter = new MemoryRateLimiter();
export function clientIp(request: Request): string {
  return process.env.TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "unknown";
}
export async function guardMutation(request: Request): Promise<void> {
  request.headers.set("x-trace-id", requestTraceId(request.headers));
  const config = getServerConfig();
  assertTrustedOrigin(request, config.trustedOrigins);
  if (config.deploymentEnv === "production") {
    if (!["gateway", "backend"].includes(process.env.RATE_LIMIT_MODE || ""))
      throw new SecurityError(503, "protection_unconfigured");
    // Shared limiting is enforced by the configured gateway/backend, never by this process-local map.
    return;
  }
  const result = await limiter.check(
    `${clientIp(request)}:${new URL(request.url).pathname}`,
  );
  if (!result.allowed) throw new SecurityError(429, "rate_limited");
}
export async function readBoundedBody(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new SecurityError(413, "body_too_large");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new SecurityError(413, "body_too_large");
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const bytes = await readBoundedBody(request);
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
export async function readFormBody(
  request: Request,
  maxBytes: number,
): Promise<FormData> {
  const bytes = await readBoundedBody(request, maxBytes);
  return new Response(bytes as BodyInit, {
    headers: { "content-type": request.headers.get("content-type") || "" },
  }).formData();
}
export function mutationFailure(
  error: unknown,
  request?: Request,
): NextResponse {
  const status =
    error instanceof SecurityError
      ? error.status
      : error instanceof HttpError && error.kind === "timeout"
        ? 504
        : error instanceof HttpError
          ? 502
          : 500;
  if (status >= 500)
    logEvent({
      level: "error",
      name: "request_failed",
      status,
      errorKind: error instanceof HttpError ? error.kind : "configuration",
      traceId: error instanceof HttpError ? error.traceId : undefined,
    });
  const key = error instanceof SecurityError ? error.code : "server_error";
  return (
    request
      ? (payload: unknown, init: ResponseInit) =>
          apiJson(request, payload, init)
      : NextResponse.json
  )(
    { code: status, message: key, errorKey: key },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
