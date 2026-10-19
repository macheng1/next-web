import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { buyerPath } from "./buyer-path";
import { backendFetch, backendRequest, type BackendPath } from "./backend";
import {
  guardMutation,
  readJsonBody,
  readFormBody,
  mutationFailure,
} from "./mutation";
import { MEMBER_TOKEN_COOKIE } from "../auth-token";
import { SecurityError } from "../security/origin";
const queryKeys = new Set([
  "page",
  "pageSize",
  "keyword",
  "status",
  "sort",
  "createdFrom",
  "createdTo",
  "afterSequence",
  "beforeSequence",
  "limit",
  "locale",
  "targetType",
  "categoryId",
]);
export async function buyerProxy(request: NextRequest, segments: string[]) {
  try {
    let path: string;
    try {
      path = buyerPath(request.method, segments);
    } catch {
      throw new SecurityError(404, "not_found");
    }
    const token = request.cookies.get(MEMBER_TOKEN_COOKIE)?.value;
    if (!token) throw new SecurityError(401, "session_expired");
    const search = new URLSearchParams();
    for (const [key, value] of request.nextUrl.searchParams) {
      if (!queryKeys.has(key) || value.length > 200)
        throw new SecurityError(400, "invalid_input");
      search.set(key, value);
    }
    const headers = new Headers({
      authorization: `Bearer ${token}`,
      "x-source-type": "portal-web",
    });
    const trace = request.headers.get("x-trace-id");
    if (trace) headers.set("x-trace-id", trace);
    let body: BodyInit | undefined;
    if (request.method !== "GET") {
      await guardMutation(request);
      const expected = request.headers.get("x-expected-member-id");
      if (!expected) throw new SecurityError(409, "session_changed");
      const actual = await backendRequest<{ id: string }>("/web/site-auth/me", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (actual.id !== expected)
        throw new SecurityError(409, "session_changed");
      headers.set("x-expected-member-id", actual.id);
      if (
        request.headers.get("content-type")?.startsWith("multipart/form-data")
      ) {
        if (path !== "/web/buyer/files")
          throw new SecurityError(400, "invalid_input");
        const form = await readFormBody(request, 10 * 1024 * 1024 + 16 * 1024);
        const file = form.get("file");
        if (
          !(file instanceof File) ||
          file.size < 1 ||
          file.size > 10 * 1024 * 1024 ||
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ].includes(file.type)
        )
          throw new SecurityError(400, "upload_size");
        const purpose = form.get("purpose");
        if (!["inquiry", "message"].includes(String(purpose)))
          throw new SecurityError(400, "invalid_input");
        const clean = new FormData();
        clean.set("file", file);
        clean.set("purpose", String(purpose));
        for (const key of ["resourceType", "resourceId"])
          if (form.has(key)) clean.set(key, String(form.get(key)));
        body = clean;
      } else {
        const json = await readJsonBody(request);
        if (!json) throw new SecurityError(400, "invalid_input");
        body = JSON.stringify(json);
        headers.set("content-type", "application/json");
      }
      if (request.method === "POST") {
        const key = request.headers.get("idempotency-key");
        if (
          !key ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            key,
          )
        )
          throw new SecurityError(400, "invalid_input");
        headers.set("idempotency-key", key);
      }
    }
    const response = await backendFetch(
      (path + (search.size ? "?" + search : "")) as BackendPath,
      { method: request.method, headers, body },
    );
    const result = await response.json();
    if (
      result &&
      typeof result === "object" &&
      result.code !== 200 &&
      result.data &&
      typeof result.data === "object"
    )
      result.errorKey =
        result.errorKey || result.data.errorKey || result.data.reasonCode;
    const output = NextResponse.json(result, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "x-trace-id": response.headers.get("x-trace-id") || "",
      },
    });
    if (response.status === 401) output.cookies.delete(MEMBER_TOKEN_COOKIE);
    return output;
  } catch (error) {
    return mutationFailure(error, request);
  }
}
