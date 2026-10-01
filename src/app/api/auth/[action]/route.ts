import { apiJson } from "@/src/lib/server/api-response";
import { MemoryRateLimiter } from "@/src/lib/security/rate-limit";
import { createHash } from "node:crypto";
import {
  clientIp,
  guardMutation,
  readJsonBody,
  mutationFailure,
} from "@/src/lib/server/mutation";
import { backendFetch } from "@/src/lib/server/backend";
import { NextRequest } from "next/server";
import {
  MEMBER_TOKEN_COOKIE,
  MEMBER_TOKEN_MAX_AGE,
  memberTokenCookieOptions,
} from "@/src/lib/auth-token";

/** wx-backend 认证代理；身份和最终权限由后端校验。 */
const BACKEND_PATHS = {
  login: "/web/auth/login",
  "forgot-password": "/web/auth/forgot-password",
  "reset-password": "/web/auth/reset-password",
  "change-password": "/web/members/me/change-password",
} as const;

type AuthAction = keyof typeof BACKEND_PATHS;

const ACTIONS = Object.keys(BACKEND_PATHS) as AuthAction[];

function isAuthAction(value: string): value is AuthAction {
  return (ACTIONS as string[]).includes(value);
}

/** 只做「格式对不对」，不做「是不是企业邮箱」这类业务判断（判断权在后端） */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

/** 密码不做 trim：首尾空格可能是用户有意输入的字符，长度校验也按原文 */
function secret(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

/**
 * 校验并**重新组装**请求体。
 *
 * 只做「形状」校验，业务规则（邮箱是否已注册、密码是否正确、token 是否有效）
 * 一律交给后端，避免两边各写一套规则后漂移。
 */
function buildPayload(
  action: AuthAction,
  body: Record<string, unknown>,
): { payload: Record<string, unknown> } | { error: string } {
  const email = text(body.email);

  if (action === "login") {
    if (!email) return { error: "请输入邮箱" };
    if (!EMAIL_RE.test(email)) return { error: "邮箱格式不正确" };
    const password = secret(body.password);
    if (!password) return { error: "请输入密码" };
    return { payload: { email, password } };
  }

  if (action === "forgot-password") {
    if (!email) return { error: "请输入邮箱" };
    if (!EMAIL_RE.test(email)) return { error: "邮箱格式不正确" };
    return { payload: { email } };
  }

  if (action === "reset-password") {
    const token = text(body.token);
    if (!token) return { error: "重置链接无效或已过期，请重新申请" };
    const newPassword = secret(body.newPassword);
    if (newPassword.length < 8) return { error: "新密码至少 8 位" };
    return { payload: { token, newPassword } };
  }

  if (action === "change-password") {
    const currentPassword = secret(body.currentPassword);
    if (!currentPassword) return { error: "请输入当前密码" };
    const newPassword = secret(body.newPassword);
    if (newPassword.length < 8) return { error: "新密码至少 8 位" };
    return { payload: { currentPassword, newPassword } };
  }

  return { error: "不支持的认证动作" };
}

/** 后端业务码。取不到返回 null —— 用于兼容网关错误页这类非标准响应 */
function readBizCode(payload: unknown): number | null {
  if (payload && typeof payload === "object") {
    const value = (payload as Record<string, unknown>).code;
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  }
  return null;
}

/**
 * 忘记密码的尽力而为限流：同一邮箱 60 秒一次（对齐后端 §7.3 的频控）。
 *
 * ⚠️ 进程内的局限：进程内 Map，Serverless 多实例下基本无效。
 * 这里只是让用户在前端就能拿到「刚发过」的即时反馈，真正的防刷在后端。
 */
const FORGOT_WINDOW = 60 * 1000;
const forgotStore = new MemoryRateLimiter(1, FORGOT_WINDOW);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    await guardMutation(request);
    const { action } = await params;

    if (!isAuthAction(action)) {
      return apiJson(request, { error: "不支持的认证动作" }, { status: 404 });
    }

    const apiUrl = process.env.MEMBER_API_URL;
    if (!apiUrl) {
      console.error(
        `Auth route error: MEMBER_API_URL is not configured (${action})`,
      );
      return apiJson(request, { error: "服务器配置错误" }, { status: 500 });
    }

    const headersList = request.headers;
    const clientIP = clientIp(request);
    const userAgent = headersList.get("user-agent") || "";

    const body = (await readJsonBody(request)) as Record<
      string,
      unknown
    > | null;

    if (!body || typeof body !== "object") {
      return apiJson(request, { error: "请求参数不合法" }, { status: 400 });
    }

    const built = buildPayload(action, body);
    if ("error" in built) {
      return apiJson(request, { error: built.error }, { status: 400 });
    }
    const { payload } = built;

    if (
      action === "forgot-password" &&
      !(
        await forgotStore.check(
          createHash("sha256")
            .update(`${clientIP}:${text(body.email)}`)
            .digest("hex"),
        )
      ).allowed
    ) {
      return apiJson(
        request,
        { error: "重置邮件请求过于频繁，请 60 秒后再试" },
        { status: 429 },
      );
    }

    // 只有改密需要登录态。登录和找回密码接口无需登录。
    const memberToken = request.cookies.get(MEMBER_TOKEN_COOKIE)?.value;
    if (action === "change-password" && !memberToken) {
      return apiJson(
        request,
        { error: "登录状态已过期，请重新登录" },
        { status: 401 },
      );
    }

    const response = await backendFetch(BACKEND_PATHS[action], {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIP,
        "User-Agent": userAgent,
        "x-source-type": "portal-web",
        "x-trace-id": request.headers.get("x-trace-id") || "",
        ...(memberToken ? { Authorization: `Bearer ${memberToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const payloadBody = await response.json().catch(() => null);
    const bizCode = readBizCode(payloadBody);

    // 两条都要判：参数类失败是 200+10003，鉴权类失败是 401+40001（见文件头说明）
    if (!response.ok || (bizCode !== null && bizCode !== 200)) {
      return apiJson(
        request,
        { code: bizCode ?? response.status, message: "认证失败，请稍后重试" },
        { status: response.status },
      );
    }

    const out: Record<string, unknown> =
      payloadBody && typeof payloadBody === "object"
        ? { ...(payloadBody as Record<string, unknown>) }
        : {};

    /** 需要写进响应的 Cookie（值, 有效期秒）；null 表示本次不动 Cookie */
    let tokenCookie: { value: string; maxAge: number } | null = null;

    if (action === "login") {
      const data = (out.data ?? null) as Record<string, unknown> | null;
      const accessToken =
        data && typeof data.accessToken === "string" ? data.accessToken : null;

      if (!accessToken) {
        console.error("Auth route error: login response has no accessToken");
        return apiJson(
          request,
          { error: "服务器响应异常，请稍后重试" },
          { status: 502 },
        );
      }

      const rawExpires = Number(data?.expiresIn);
      const maxAge =
        Number.isFinite(rawExpires) && rawExpires > 0
          ? Math.min(Math.floor(rawExpires), MEMBER_TOKEN_MAX_AGE)
          : MEMBER_TOKEN_MAX_AGE;

      // 登录态落在 httpOnly Cookie，理由见 src/lib/auth-token.ts
      tokenCookie = { value: accessToken, maxAge };

      // 剥掉 accessToken：不把凭证交给前端 JS
      const safeData: Record<string, unknown> = { ...data, expiresIn: maxAge };
      delete safeData.accessToken;
      out.data = safeData;
    } else if (action === "reset-password" || action === "change-password") {
      // 这两个动作都会让后端 tokenVersion++ → 手里的旧 token 立即失效。
      // 主动清 Cookie，免得留下一个「看着还在、其实用不了」的登录态。
      tokenCookie = { value: "", maxAge: 0 };
    }

    const next = apiJson(request, out, {
      headers: { "Cache-Control": "no-store" },
    });
    if (tokenCookie) {
      next.cookies.set(
        MEMBER_TOKEN_COOKIE,
        tokenCookie.value,
        memberTokenCookieOptions(tokenCookie.maxAge),
      );
    }
    return next;
  } catch (error) {
    return mutationFailure(error, request);
  }
}
