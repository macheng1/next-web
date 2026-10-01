import { apiJson } from "@/src/lib/server/api-response";
import { getSession } from "@/src/lib/server/session";
import {
  MEMBER_TOKEN_COOKIE,
  memberTokenCookieOptions,
} from "@/src/lib/auth-token";
export async function GET(request: Request) {
  const session = await getSession();
  const status =
    session.status === "authenticated"
      ? 200
      : session.status === "anonymous"
        ? 401
        : 503;
  const response = apiJson(
    request,
    {
      code: status,
      data: session.status === "authenticated" ? session.member : null,
      errorKey:
        status === 503
          ? "service_unavailable"
          : status === 401
            ? "session_expired"
            : undefined,
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
  if (session.status === "anonymous" && session.invalidated)
    response.cookies.set(MEMBER_TOKEN_COOKIE, "", memberTokenCookieOptions(0));
  return response;
}
