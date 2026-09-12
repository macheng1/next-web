/**
 * web 端会员登录态（BFF 侧）。
 *
 * ⚠️ **与 wx-backend 文档的一处有意偏离，改前请先读这段。**
 *
 * 后端文档（`docs/api-fields.md` §7.2 / `docs/frontend-integration.md` §9）建议前端把
 * `accessToken` 存进 localStorage、key 用 `member_web_token`（有效期 8 小时）。
 * 那是「前端直连后端」场景下的写法 —— 而本项目的所有后端调用都经 BFF
 * （见 `/api/portal/*`、`/api/auth/*`），前端本来就拿不到后端地址。
 *
 * 所以这里改成：**token 由 BFF 写进 httpOnly Cookie，不回传给 JS**。
 * - 好处：XSS 拿不走凭证；各页面/组件完全不需要感知 token 的存在。
 * - 后续会员中心（`GET /web/members/me` 等）沿用同一约定：
 *   BFF 从 Cookie 读 token → 注入 `Authorization: Bearer <token>`。
 * - 如果哪天要改成前端直连后端，只需要把登录接口的 `accessToken` 重新透传出去，
 *   并删掉这个文件里的 Cookie 落地逻辑。
 */
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
    maxAge,
  };
}
