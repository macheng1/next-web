/**
 * 短信验证码接口层（客户端）。
 *
 * 与 `auth-api.ts` / `upload-api.ts` 同一套路：前端只调 BFF 相对路径
 * `/api/sms/send-code`，真实后端路径（`/sms/send-code`）只留在
 * `src/app/api/sms/send-code/route.ts`。
 *
 * 后端契约（wx-backend `docs/api-fields.md` §7.5 注册前置）：
 *
 * ```
 * POST /sms/send-code   { phone, scene }
 * ```
 *
 * 三条必须记住的规则：
 * 1. **`scene` 发送与校验必须是同一个值。** 注册走 `register`：发送时用 `register`，
 *    提交注册时后端也用 `register` 校验（`WebRegisterService` 里 `verifyCode(phone, code, 'register')`）。
 *    发送用了别的 scene，提交时会报「验证码错误」，而且极难排查。
 * 2. **同一手机号 + 同一 scene 60 秒只能发一次**，再发后端返回
 *    `10001 验证码发送过于频繁，请稍后再试`。所以前端倒计时按 60 秒走（`SMS_RESEND_SECONDS`），
 *    真正的防刷在后端 —— 前端倒计时只是为了别让用户白点。
 * 3. **验证码校验成功即销毁**（后端 `verifyCode` 里 del），一次性、过期时间由
 *    后端 `SMS_CODE_EXPIRES` 控制。开发环境未配短信 Key 时**不发短信**，
 *    验证码只打在后端日志里（`[DEV ONLY][REGISTER] 手机号 xxxx 的验证码是: 123456`）。
 *
 * 错误语义复用 `auth-api.ts` 的 `AuthError`（`code: network | business`），
 * 表单那边的 `resolveAuthError()` 不用改就能处理发送失败的提示文案。
 */

import { AuthError } from "./auth-api";
import {
  BIZ_CODE_OK,
  generateTraceId,
  pickMessage,
  readBizCode,
} from "./api-envelope";

/** 与后端 `SendVerificationCodeDto` 的 `SmsScene` 枚举一一对应 */
export const SMS_SCENES = {
  LOGIN: "login",
  REGISTER: "register",
  RESET_PASSWORD: "reset_pwd",
  BIND_PHONE: "bind_phone",
} as const;

export type SmsScene = (typeof SMS_SCENES)[keyof typeof SMS_SCENES];

/** 与后端一致：同一手机号 + 同一 scene 60 秒内只能发一次（前端倒计时同值） */
export const SMS_RESEND_SECONDS = 60;

/** 与后端 DTO 一致：中国大陆手机号 */
export const PHONE_RE = /^1[3-9]\d{9}$/;

/** 与后端 DTO 一致：6 位数字验证码 */
export const SMS_CODE_RE = /^\d{6}$/;

export interface SendSmsCodeResult {
  phone: string;
  scene: SmsScene;
  /** 后端原文：「验证码已发送，请注意查收」 */
  message: string;
}

/**
 * 发送短信验证码（公开接口，不要求登录）。
 *
 * 调用方应先做手机号格式校验，避免为一个明显的错号跑一趟请求；
 * 这里的报错信息直接来自后端 / BFF，可原样展示（含「发送过于频繁」这类频控提示）。
 */
export async function sendSmsCode(
  input: { phone: string; scene: SmsScene },
  fallbackMessage: string,
): Promise<SendSmsCodeResult> {
  let response: Response;

  try {
    response = await fetch("/api/sms/send-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-trace-id": generateTraceId(),
        "x-source-type": "portal-web",
      },
      body: JSON.stringify({ phone: input.phone, scene: input.scene }),
    });
  } catch {
    throw new AuthError("network", fallbackMessage);
  }

  const body = await response.json().catch(() => null);

  // §1.3：业务失败也可能是 HTTP 200，成败必须看 body.code
  const bizCode = readBizCode(body);
  if (!response.ok || (bizCode !== null && bizCode !== BIZ_CODE_OK)) {
    throw new AuthError(
      "business",
      pickMessage(body, fallbackMessage),
      response.status,
      bizCode ?? undefined,
    );
  }

  return (
    (body as { data?: SendSmsCodeResult } | null)?.data ?? {
      phone: input.phone,
      scene: input.scene,
      message: "",
    }
  );
}
