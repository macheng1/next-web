import {
  BIZ_CODE_OK,
  requestTraceId,
  pickMessage,
  readBizCode,
} from "../api-envelope";
import { HttpError, type RequestOptions } from "./types";
export { HttpError } from "./types";
export async function fetchResponse(
  url: string,
  options: RequestOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 10_000,
    retries = 0,
    fallbackMessage = "Request failed",
    maxResponseBytes = 12 * 1024 * 1024,
    ...init
  } = options;
  const headers = new Headers(init.headers);
  const traceId = requestTraceId(headers);
  headers.set("x-trace-id", traceId);
  headers.set("x-source-type", "portal-web");
  if (typeof document !== "undefined")
    headers.set("x-ui-locale", document.documentElement.lang);
  if (init.body instanceof FormData) headers.delete("content-type");
  const attempts =
    (init.method || "GET").toUpperCase() === "GET"
      ? Math.min(Math.max(retries, 0), 1) + 1
      : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (init.signal?.aborted) abort();
    else init.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      if (controller.signal.aborted) throw new Error("aborted");
      const res = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });
      // Buffer under the same timeout so a stalled response body cannot hang callers.
      const chunks: Uint8Array[] = [];
      let length = 0;
      const reader = res.body?.getReader();
      if (reader) {
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          length += item.value.length;
          if (length > maxResponseBytes) {
            await reader.cancel();
            throw new HttpError(
              "http",
              fallbackMessage,
              502,
              undefined,
              traceId,
            );
          }
          chunks.push(item.value);
        }
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const result = new Response(
        [204, 205, 304].includes(res.status) ? null : bytes,
        {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        },
      );
      result.headers.set("x-trace-id", traceId);
      if (res.status >= 500 && attempt + 1 < attempts) continue;
      return result;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      const kind = init.signal?.aborted
        ? "aborted"
        : timedOut
          ? "timeout"
          : "network";
      if (kind !== "aborted" && attempt + 1 < attempts) continue;
      throw new HttpError(kind, fallbackMessage, undefined, undefined, traceId);
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener("abort", abort);
    }
  }
  throw new HttpError(
    "network",
    fallbackMessage,
    undefined,
    undefined,
    traceId,
  );
}
export async function requestJson<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetchResponse(url, options);
  const fallback = options.fallbackMessage || "Request failed";
  const payload: unknown = await response.json().catch(() => null);
  const code = readBizCode(payload);
  const trace = response.headers.get("x-trace-id") || undefined;
  if (!response.ok)
    throw new HttpError(
      "http",
      pickMessage(payload, fallback),
      response.status,
      code ?? undefined,
      trace,
    );
  if (code !== null && code !== BIZ_CODE_OK)
    throw new HttpError(
      "business",
      pickMessage(payload, fallback),
      response.status,
      code,
      trace,
    );
  if (payload === null)
    throw new HttpError("http", fallback, 502, undefined, trace);
  return (
    typeof payload === "object" && "data" in payload
      ? (payload as { data: T }).data
      : payload
  ) as T;
}
