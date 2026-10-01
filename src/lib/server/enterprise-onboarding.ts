import "server-only";
import { apiJson } from "./api-response";
import { readBizCode } from "../api-envelope";
export async function enterpriseResponse(request: Request, response: Response) {
  const body = await response.json().catch(() => null);
  const code = readBizCode(body);
  if (response.ok && code === 200) return apiJson(request, body);
  const message = typeof body?.message === "string" ? body.message : "";
  const errorKey = /已有申请|企业已存在|企业记录|重复提交/.test(message)
    ? "enterprise_exists"
    : /请求编号/.test(message)
      ? "request_conflict"
      : /验证码.*过期|未获取/.test(message)
        ? "sms_expired"
        : /验证码错误/.test(message)
          ? "sms_invalid"
          : /过于频繁|频率|稍后.*验证码|发送.*频繁/.test(message)
            ? "rate_limited"
            : response.status >= 500
              ? "server_error"
              : "invalid_input";
  const status = response.ok
    ? errorKey === "rate_limited"
      ? 429
      : 400
    : response.status;
  return apiJson(
    request,
    { code: code ?? status, errorKey },
    {
      status,
      headers:
        errorKey === "rate_limited" ? { "Retry-After": "60" } : undefined,
    },
  );
}
