import { sessionResponseStatus } from "@/src/lib/auth/session-status";
import { apiJson } from "@/src/lib/server/api-response";
import { getSession } from "@/src/lib/server/session";
import {
  MEMBER_TOKEN_COOKIE,
  memberTokenCookieOptions,
} from "@/src/lib/auth-token";
export async function GET(request: Request) {
  const session = await getSession();
  const optional = new URL(request.url).searchParams.get("optional") === "1";
  const status = sessionResponseStatus(session.status, optional);
  const response = apiJson(
    request,
    {
      code: status,
      data: optional ? session : session.status === "authenticated" ? session.member : null,
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
