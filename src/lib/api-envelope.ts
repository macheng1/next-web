/**
 * 后端响应信封的解析工具（客户端 / 服务端通用）。
 *
 * 抽这一层的唯一理由：本仓有多个「调后端 → 看 `body.code` 判成败」的地方
 * （`lib/auth-api.ts`、`lib/upload-api.ts`、以及 BFF 路由），
 * 各写一份必然漂移 —— 尤其「HTTP 200 也可能是业务失败」这条约定，
 * 漏判一处就会把失败当成功。
 *
 * 后端信封（wx-backend `docs/api-fields.md` §1.2 / §1.3）：
 * `{ code: 200, data: {...}, message?: string }`，业务失败时 `code` 非 200，
 * 但 **HTTP 状态码常常仍是 200**（只有 401/403/429/500 才透传真实状态码）。
 */

/** 后端约定的成功业务码 */
export const BIZ_CODE_OK = 200;

/**
 * 读后端业务码（`body.code`）。
 * 取不到返回 `null` —— 用于兼容网关错误页这类非标准响应，
 * 调用方据此走「响应非 ok 就报错」的兜底分支。
 */
export function readBizCode(payload: unknown): number | null {
  if (payload && typeof payload === "object") {
    const value = (payload as Record<string, unknown>).code;
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  }
  return null;
}

/**
 * 从响应体里挑一句能给用户看的话。
 *
 * 后端约定用 `message`（§1.2）；`error` / `msg` 是容错。
 * 参数校验失败时 `data` 是错误信息字符串数组（§1.2 / §1.5），也一并兜住。
 */
export function pickMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of ["message", "error", "msg"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }

    const data = record.data;
    if (Array.isArray(data)) {
      const first = data.find((item) => typeof item === "string" && item.trim());
      if (typeof first === "string") return first.trim();
    }
    if (typeof data === "string" && data.trim()) return data.trim();
  }
  return fallback;
}

/** 与 `portal-api` 保持同一套 trace 约定，便于后端串联日志 */
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
