/**
 * 认证接口层（客户端）。
 *
 * ⚠️ 后端鉴权接口由后端仓（wx-backend）维护，前端只按 BFF 约定调用相对路径
 * `/api/auth/*`，真实后端路径集中在 `src/app/api/auth/[action]/route.ts` 顶部，
 * 后端一改只需动那一处，前端组件零改动。
 *
 * 字段与流程以后端文档为准（wx-backend）：
 * - `docs/api-fields.md` §7（7.2 登录 / 7.3 忘记密码 / 7.4 重置密码 / 7.5 注册 / 7.10 改密）
 * - `docs/frontend-integration.md` §9
 *
 * 注册是**两段式**：先 `sendSmsCode()`（`./sms-api`，BFF `/api/sms/send-code`）拿验证码，
 * 再把 `phone` + `smsCode` 随 `register()` 一起提交 —— 后端两次的 `scene` 必须都是
 * `register`，否则校验不过。详见 `./sms-api` 的文件头。
 *
 * 两条必须记住的后端约定：
 * 1. **HTTP 状态码不可信，成败一律看 `body.code`**（§1.3）。
 *    实测（本机 4000 端口）两类失败的样子不同，`postAuth` 两边都判了：
 *      - 参数/业务校验失败 → HTTP 200 + `code:10003`（重置 token 无效、注册多传字段）
 *      - 鉴权失败 → HTTP 401 + `code:40001`（密码错、token 缺失或过期）
 *    组件层不需要自己判，拿到的 `AuthError.message` 已可直接展示。
 * 2. **多传字段直接 400**（§1.5，`forbidNonWhitelisted`）—— 所以 BFF 侧做了字段白名单，
 *    这里传参也必须严格按接口字段表来。
 *
 * 信封解析（`body.code` / `message` / trace id）在 `./api-envelope`，
 * 与 `./upload-api` 共用 —— 那条「HTTP 200 也可能是失败」的规则只有一处实现。
 *
 * 错误统一抛 `AuthError`：`code === "network"` 表示请求根本没发出去（断网 / 超时），
 * 调用方应回落到本地文案；`code === "business"` 表示后端明确拒绝，
 * `message` 是可直接展示给用户的原因。
 * 拿不准怎么把异常转成提示文案时，用 `resolveAuthError()`。
 */

import {
  BIZ_CODE_OK,
  generateTraceId,
  pickMessage,
  readBizCode,
} from "./api-envelope";

export type AuthAction =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "change-password";

/** 登录响应里的会员基础资料（完整资料要再调 `GET /web/members/me`） */
export interface MemberBrief {
  id: string;
  email: string;
  memberType: "personal" | "enterprise";
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  /**
   * ⚠️ 后端返回的 `accessToken` 已被 BFF 收进 httpOnly Cookie，**不会出现在这里**
   * （见 `src/lib/auth-token.ts` 的理由说明）。
   */
  expiresIn: number;
  /** true 时必须跳强制改密页：除改密与查认证状态外，后端对其余接口一律 403 */
  mustChangePassword: boolean;
  member: MemberBrief;
}

export interface RegisterInput {
  email: string;
  /**
   * 手机号码（必填）。必须先用 `sendSmsCode({ phone, scene: "register" })` 拿到验证码，
   * 后端在注册时还会查这个号是否已被 web 端注册过
   */
  phone: string;
  /** 短信验证码（6 位数字，必填）。scene 必须与发送时一致（register） */
  smsCode: string;
  /** 企业名称，必填，≤256 */
  companyName: string;
  /** 统一社会信用代码，≤32 */
  creditCode?: string;
  /** 法人姓名，≤64 */
  legalPerson?: string;
  /** 营业执照 OSS 地址，≤500。先用 `uploadWebFile()`（`./upload-api`）拿到 `url` 再填 */
  businessLicenseUrl?: string;
  /** 注册地址，≤500 */
  registeredAddress?: string;
}

export interface RegisterResult {
  memberId: string;
  email: string;
  /** 后端原文：「申请已提交，审核结果将通过邮件通知」 */
  message: string;
}

export interface ForgotPasswordResult {
  message: string;
}

export interface ResetPasswordInput {
  /** 邮件链接里的 token，有效期 30 分钟且只能用一次 */
  token: string;
  newPassword: string;
}

export interface ResetPasswordResult {
  message: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  message: string;
}

export class AuthError extends Error {
  readonly code: "network" | "business";
  /** HTTP 状态码；网络异常时为 undefined */
  readonly httpStatus?: number;
  /** 后端业务码（§1.4：10001 已存在 / 10003 参数错 / 40001 未登录 …） */
  readonly bizCode?: number;

  constructor(
    code: "network" | "business",
    message: string,
    httpStatus?: number,
    bizCode?: number,
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.bizCode = bizCode;
  }
}

async function postAuth<T>(
  action: AuthAction,
  payload: Record<string, unknown>,
  fallbackMessage: string,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`/api/auth/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-trace-id": generateTraceId(),
        "x-source-type": "portal-web",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthError("network", fallbackMessage);
  }

  const body = await response.json().catch(() => null);

  // §1.3：业务失败也是 HTTP 200，成败必须看 body.code
  const bizCode = readBizCode(body);
  if (!response.ok || (bizCode !== null && bizCode !== BIZ_CODE_OK)) {
    throw new AuthError(
      "business",
      pickMessage(body, fallbackMessage),
      response.status,
      bizCode ?? undefined,
    );
  }

  if (body && typeof body === "object" && "data" in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/**
 * 把异常转成可直接展示的提示文案。
 *
 * 三个表单的 catch 块结构完全一致，抽出来避免「有一处忘了判 network 就直接显示
 * 后端原文」这种漂移。
 */
export function resolveAuthError(
  error: unknown,
  fallbackMessage: string,
  networkMessage: string,
): string {
  if (error instanceof AuthError) {
    return error.code === "network" ? networkMessage : error.message;
  }
  return fallbackMessage;
}

/** 登录。成功时登录态已由 BFF 写入 httpOnly Cookie */
export function login(input: LoginInput, fallbackMessage: string) {
  return postAuth<LoginResult>("login", { ...input }, fallbackMessage);
}

/** 提交企业注册申请。**不发 token**：审核通过后才由后台生成初始密码并邮件下发 */
export function register(input: RegisterInput, fallbackMessage: string) {
  return postAuth<RegisterResult>("register", { ...input }, fallbackMessage);
}

/** 申请重置密码：后端恒返回同一句话（防账号枚举），成败不体现在响应里 */
export function requestPasswordReset(email: string, fallbackMessage: string) {
  return postAuth<ForgotPasswordResult>("forgot-password", { email }, fallbackMessage);
}

/** 用邮件链接里的 token 重置密码。成功后该会员两端的所有旧 token 立即失效 */
export function resetPassword(input: ResetPasswordInput, fallbackMessage: string) {
  return postAuth<ResetPasswordResult>("reset-password", { ...input }, fallbackMessage);
}

/** 改密（强制改密页也走这个）。成功后旧 token 立即失效，必须用新密码重新登录 */
export function changePassword(input: ChangePasswordInput, fallbackMessage: string) {
  return postAuth<ChangePasswordResult>("change-password", { ...input }, fallbackMessage);
}
