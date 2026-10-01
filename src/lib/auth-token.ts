/** Server-issued HttpOnly session cookie. Browser code never receives the backend token. */
export const MEMBER_TOKEN_COOKIE = "member_web_token";

/** 后端 JWT 有效期 8 小时（§1.6），文档 7.2 的 `expiresIn` 也是 28800 */
export const MEMBER_TOKEN_MAX_AGE = 8 * 60 * 60;

/** 与 `NextResponse.cookies.set` 的入参形状对齐 */
export interface MemberTokenCookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
}

export function memberTokenCookieOptions(
  maxAge: number = MEMBER_TOKEN_MAX_AGE,
): MemberTokenCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    // 本地开发是 http，Secure Cookie 写不进去
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Number.isFinite(maxAge) ? Math.max(0, Math.min(Math.floor(maxAge), MEMBER_TOKEN_MAX_AGE)) : 0,
  };
}
