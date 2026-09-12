import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  MEMBER_TOKEN_COOKIE,
  MEMBER_TOKEN_MAX_AGE,
  memberTokenCookieOptions,
} from "@/src/lib/auth-token";

/**
 * 认证 BFF 转发路由：`POST /api/auth/{action}` → 后端 `${API_URL}{BACKEND_PATHS[action]}`
 *
 * 为什么不直接在前端调后端：与 `/api/portal/[domain]/inquiry` 同一套约定 ——
 * 后端地址（`API_URL`）只存在于服务端，前端不感知；同时这里承担
 * **字段白名单**与基础校验，后端只需要信任这道门之后的请求。
 *
 * ⚠️ **后端契约来自 wx-backend，改这张表前先看两处文档**：
 * `docs/api-fields.md` §7（7.2 登录 / 7.3 忘记密码 / 7.4 重置密码 / 7.5 注册 / 7.10 改密）
 * 和 `docs/frontend-integration.md` §9。两条最关键的约定：
 *
 * 1. **HTTP 状态码不可信，成败一律看 `body.code`**（api-fields.md §1.3）。
 *    实测（本机 4000 端口）两类失败长得完全不一样，所以 `!response.ok`
 *    和 `code !== 200` **必须各判一次**，少判哪边都会漏：
 *      - 参数/业务校验失败 → HTTP **200** + `code:10003`
 *        （如重置密码 token 无效、注册多传字段）
 *      - 鉴权失败 → HTTP **401** + `code:40001`
 *        （如密码错、token 缺失或过期）
 * 2. **多传一个字段就 400**（§1.5 `whitelist` + `forbidNonWhitelisted`）：
 *    所以下面的 `buildPayload` 会把请求体**重新组装**一遍，只放行各接口字段表里的字段，
 *    并把空串剔除（可选字段传空串会以空字符串落库）。
 *
 * 3. **注册（§7.5）是「手机号 + 短信验证码」两段式**：手机号与 `smsCode` 都是后端必填，
 *    验证码要先经 `/api/sms/send-code`（scene=register）拿到。少传任何一项后端都会 10003，
 *    所以这里按同一套「形状」规则先挡一道，用户不必为一个显然的错误等一个来回。
 */

const BACKEND_PATHS = {
  login: "/web/auth/login",
  register: "/web/members/register",
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

/** 与后端 `WebRegisterDto` 一致：中国大陆手机号 */
const PHONE_RE = /^1[3-9]\d{9}$/;

/** 与后端 `WebRegisterDto` 一致：6 位数字验证码 */
const SMS_CODE_RE = /^\d{6}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

/** 密码不做 trim：首尾空格可能是用户有意输入的字符，长度校验也按原文 */
function secret(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

/** 注册接口的可选字段白名单：[字段名, 最大长度]，与 api-fields.md §7.5 字段表一一对应 */
const REGISTER_OPTIONAL_FIELDS: [string, number][] = [
  ["creditCode", 32],
  ["legalPerson", 64],
  ["registeredAddress", 500],
  ["businessLicenseUrl", 500],
];

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

  // register
  if (!email) return { error: "请输入邮箱" };
  if (!EMAIL_RE.test(email)) return { error: "邮箱格式不正确" };

  // 手机号 + 短信验证码：后端 §7.5 的必填项（验证码已在 /api/sms/send-code 发过）
  const phone = text(body.phone);
  if (!phone) return { error: "请输入手机号码" };
  if (!PHONE_RE.test(phone)) return { error: "手机号码格式不正确" };

  const smsCode = text(body.smsCode);
  if (!smsCode) return { error: "请输入短信验证码" };
  if (!SMS_CODE_RE.test(smsCode)) return { error: "短信验证码为 6 位数字" };

  const companyName = text(body.companyName);
  if (!companyName) return { error: "请输入企业名称" };
  if (companyName.length > 256) return { error: "企业名称不超过 256 个字符" };

  const payload: Record<string, unknown> = {
    email,
    phone,
    smsCode,
    companyName,
  };
  for (const [key, maxLength] of REGISTER_OPTIONAL_FIELDS) {
    const value = text(body[key]);
    if (!value) continue;
    if (value.length > maxLength) return { error: `${key} 不超过 ${maxLength} 个字符` };
    payload[key] = value;
  }
  return { payload };
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
 * ⚠️ 与询价路由同样的局限：进程内 Map，Serverless 多实例下基本无效。
 * 这里只是让用户在前端就能拿到「刚发过」的即时反馈，真正的防刷在后端。
 */
const FORGOT_WINDOW = 60 * 1000;
const forgotStore = new Map<string, number>();

function forgotLimited(key: string, now: number): boolean {
  const last = forgotStore.get(key) ?? 0;
  if (now - last < FORGOT_WINDOW) return true;
  forgotStore.set(key, now);
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;

    if (!isAuthAction(action)) {
      return NextResponse.json({ error: "不支持的认证动作" }, { status: 404 });
    }

    // ⚠️ 本项目同时对接两套后端，别混用：
    //   - 会员/认证（本文件）→ MEMBER_API_URL（wx-backend，前缀 /api/v1）
    //   - 门户数据 / 询价 / 访客附件 → API_URL（m-wms-backend，前缀 /api）
    // MEMBER_API_URL 未配时回退 API_URL，兼容只配了一个变量的部署。详见 .env.example。
    const apiUrl = process.env.MEMBER_API_URL || process.env.API_URL;
    if (!apiUrl) {
      console.error(
        `Auth route error: MEMBER_API_URL / API_URL is not configured (${action})`,
      );
      return NextResponse.json({ error: "服务器配置错误" }, { status: 500 });
    }

    const headersList = await headers();
    const clientIP =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "";

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "请求参数不合法" }, { status: 400 });
    }

    const built = buildPayload(action, body);
    if ("error" in built) {
      return NextResponse.json({ error: built.error }, { status: 400 });
    }
    const { payload } = built;

    if (
      action === "forgot-password" &&
      forgotLimited(`${clientIP}:${text(body.email)}`, Date.now())
    ) {
      return NextResponse.json(
        { error: "重置邮件请求过于频繁，请 60 秒后再试" },
        { status: 429 },
      );
    }

    // 只有改密需要登录态。其余四个动作都是公开接口（注册 / 登录 / 找回密码）。
    const memberToken = request.cookies.get(MEMBER_TOKEN_COOKIE)?.value;
    if (action === "change-password" && !memberToken) {
      return NextResponse.json(
        { error: "登录状态已过期，请重新登录" },
        { status: 401 },
      );
    }

    const response = await fetch(`${apiUrl}${BACKEND_PATHS[action]}`, {
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
      return NextResponse.json(
        payloadBody ?? { error: "认证失败，请稍后重试" },
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
        return NextResponse.json(
          { error: "服务器响应异常，请稍后重试" },
          { status: 502 },
        );
      }

      const rawExpires = Number(data?.expiresIn);
      const maxAge =
        Number.isFinite(rawExpires) && rawExpires > 0
          ? rawExpires
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

    const next = NextResponse.json(out);
    if (tokenCookie) {
      next.cookies.set(
        MEMBER_TOKEN_COOKIE,
        tokenCookie.value,
        memberTokenCookieOptions(tokenCookie.maxAge),
      );
    }
    return next;
  } catch (error) {
    console.error("Auth route error:", error);
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  }
}
