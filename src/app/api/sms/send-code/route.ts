import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { readBizCode } from "@/src/lib/api-envelope";

/**
 * 短信验证码 BFF 路由：`POST /api/sms/send-code` → 后端 `${MEMBER_API_URL}/sms/send-code`
 *
 * 与 `/api/auth/[action]` 同一套约定：后端地址只存在于服务端；这里承担**字段白名单**
 * 与基础校验（后端只需要信任这道门之后的请求）。
 *
 * ⚠️ **改这张表前先看 wx-backend `docs/api-fields.md` §7.5 / §7.2**：
 * - 注册页是当前唯一的调用方，scene 固定 `register`；后端提交注册时用**同一个 scene**
 *   校验（`WebRegisterService.verifyCode(phone, code, 'register')`），发送时换个值就会
 *   「验证码错误」——所以这里的场景白名单刻意收窄，别的场景要放行必须同步确认对应页面。
 * - 后端自己按「手机号 + scene」做 60 秒频控，前端不再叠一层服务端限流
 *   （`/api/auth/[action]` 的 forgot-password 那层是历史遗留，只做即时反馈）。
 *
 * 会员/认证类接口一律走 `MEMBER_API_URL`（wx-backend，前缀 `/api/v1`），
 * 不要用 `API_URL`（那是门户后端 m-wms-backend）。详见 `.env.example`。
 */

/** 允许通过本路由发送验证码的场景（当前只有注册页在用） */
const ENABLED_SCENES = ["register"] as const;

/** 与后端 `SendVerificationCodeDto` 一致 */
const PHONE_RE = /^1[3-9]\d{9}$/;

const BACKEND_PATH = "/sms/send-code";

export async function POST(request: NextRequest) {
  try {
    const apiUrl = process.env.MEMBER_API_URL || process.env.API_URL;
    if (!apiUrl) {
      console.error("SMS route error: MEMBER_API_URL / API_URL is not configured");
      return NextResponse.json({ error: "服务器配置错误" }, { status: 500 });
    }

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "请求参数不合法" }, { status: 400 });
    }

    // 只做「形状」校验：这个号能不能收短信、有没有被占用，一律交给后端
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!phone) return NextResponse.json({ error: "请输入手机号码" }, { status: 400 });
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "手机号码格式不正确" }, { status: 400 });
    }

    const scene = typeof body.scene === "string" ? body.scene : "";
    if (!(ENABLED_SCENES as readonly string[]).includes(scene)) {
      return NextResponse.json({ error: "不支持的验证码场景" }, { status: 400 });
    }

    const headersList = await headers();
    const clientIP =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "";

    const response = await fetch(`${apiUrl}${BACKEND_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIP,
        "User-Agent": userAgent,
        "x-source-type": "portal-web",
        "x-trace-id": request.headers.get("x-trace-id") || "",
      },
      body: JSON.stringify({ phone, scene }),
    });

    const payloadBody = await response.json().catch(() => null);
    const bizCode = readBizCode(payloadBody);

    // 两条都要判：参数类失败是 200 + 10003，鉴权/限流类才透传真实状态码
    if (!response.ok || (bizCode !== null && bizCode !== 200)) {
      return NextResponse.json(
        payloadBody ?? { error: "验证码发送失败，请稍后重试" },
        { status: response.status },
      );
    }

    return NextResponse.json(payloadBody);
  } catch (error) {
    console.error("SMS route error:", error);
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  }
}
