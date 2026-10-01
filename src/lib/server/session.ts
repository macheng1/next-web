import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { backendRequest } from "./backend";
import { MEMBER_TOKEN_COOKIE } from "../auth-token";
import { HttpError } from "../http/types";
export interface WebMember {
  id: string;
  email: string | null;
  memberType: "personal" | "enterprise";
  nickname: string | null;
  avatarUrl: string | null;
  mustChangePassword: boolean;
}
export type SessionResult =
  | { status: "authenticated"; member: WebMember }
  | { status: "anonymous"; invalidated: boolean }
  | { status: "unavailable" };
export async function resolveSession(
  token: string | undefined,
  load: (token: string) => Promise<unknown>,
): Promise<SessionResult> {
  if (!token) return { status: "anonymous", invalidated: false };
  try {
    const raw = await load(token);
    if (!raw || typeof raw !== "object") return { status: "unavailable" };
    const value = raw as Record<string, unknown>;
    if (
      typeof value.id !== "string" ||
      !["personal", "enterprise"].includes(String(value.memberType))
    )
      return { status: "unavailable" };
    return {
      status: "authenticated",
      member: {
        id: value.id,
        email: typeof value.email === "string" ? value.email : null,
        memberType: value.memberType as WebMember["memberType"],
        nickname: typeof value.nickname === "string" ? value.nickname : null,
        avatarUrl: typeof value.avatarUrl === "string" ? value.avatarUrl : null,
        mustChangePassword: value.mustChangePassword === true,
      },
    };
  } catch (error) {
    if (
      error instanceof HttpError &&
      (error.status === 401 || error.bizCode === 40001)
    )
      return { status: "anonymous", invalidated: true };
    return { status: "unavailable" };
  }
}
export const getSession = cache(async (): Promise<SessionResult> => {
  const token = (await cookies()).get(MEMBER_TOKEN_COOKIE)?.value;
  return resolveSession(token, (value) =>
    backendRequest("/web/members/me", {
      headers: { authorization: `Bearer ${value}` },
    }),
  );
});
export async function requireSession(): Promise<WebMember> {
  const session = await getSession();
  if (session.status === "unavailable")
    throw new HttpError("http", "Service unavailable", 503);
  if (session.status !== "authenticated")
    throw new HttpError("http", "Authentication required", 401);
  return session.member;
}
