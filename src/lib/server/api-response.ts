import { requestTraceId } from "../api-envelope";
import "server-only";
import { NextResponse } from "next/server";
import zh from "@/src/dictionaries/zh.json";
import en from "@/src/dictionaries/en.json";
import { resolveLanguage } from "../i18n/locale";
export function apiJson(
  request: Request,
  payload: unknown,
  init: ResponseInit = {},
): NextResponse {
  const status = init.status || 200;
  let result = payload;
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    const failed =
      status >= 400 || (body.code != null && Number(body.code) !== 200);
    if (failed) {
      const cookie = request.headers
        .get("cookie")
        ?.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)?.[1];
      const locale = resolveLanguage({
        pathLocale: request.headers.get("x-ui-locale") || undefined,
        cookieLocale: cookie,
        acceptLanguage: request.headers.get("accept-language") || undefined,
      });
      const errors = (locale === "en" ? en : zh).foundation.errors;
      const suggested =
        typeof body.errorKey === "string"
          ? body.errorKey
          : status === 401
            ? "session_expired"
            : status === 429
              ? "rate_limited"
              : status >= 500
                ? "server_error"
                : status === 403
                  ? "untrusted_origin"
                  : status === 413
                    ? "body_too_large"
                    : status === 400
                      ? "invalid_input"
                      : "request_failed";
      const key =
        suggested in errors
          ? (suggested as keyof typeof errors)
          : "request_failed";
      result = {
        code: body.code ?? status,
        errorKey: key,
        message: errors[key],
        error: errors[key],
      };
    }
  }
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("x-trace-id", requestTraceId(request.headers));
  return NextResponse.json(result, { ...init, headers });
}
