import { apiJson } from "@/src/lib/server/api-response";
import {
  validateUpload,
  DEFAULT_UPLOAD_POLICY,
} from "@/src/lib/security/upload";
import {
  clientIp,
  guardMutation,
  readFormBody,
  mutationFailure,
} from "@/src/lib/server/mutation";
import { backendFetch } from "@/src/lib/server/backend";
import { NextRequest } from "next/server";
import { BIZ_CODE_OK, readBizCode } from "@/src/lib/api-envelope";

const ALLOWED_MODULES = ["enterprise-license", "enterprise"] as const;
const DEFAULT_MODULE: (typeof ALLOWED_MODULES)[number] = "enterprise-license";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const PARAM_INVALID = 10003;

function paramInvalid(request: Request, message: string) {
  return apiJson(request, { code: PARAM_INVALID, message }, { status: 400 });
}

function isAllowedModule(
  value: string,
): value is (typeof ALLOWED_MODULES)[number] {
  return (ALLOWED_MODULES as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  try {
    await guardMutation(request);
    const apiUrl = process.env.MEMBER_API_URL;
    if (!apiUrl) {
      console.error("Upload route error: MEMBER_API_URL is not configured");
      return apiJson(request, { message: "服务器配置错误" }, { status: 500 });
    }

    const formData = await readFormBody(request, 11 * 1024 * 1024);
    const file = formData.get("file");
    // 变量不叫 `module`：Next 的 no-assign-module-variable 规则会拦（会与打包器变量混淆）
    const uploadModule =
      String(formData.get("module") ?? "").trim() || DEFAULT_MODULE;

    if (!(file instanceof File) || file.size === 0) {
      return paramInvalid(request, "请选择要上传的文件");
    }
    if (!isAllowedModule(uploadModule)) {
      return paramInvalid(
        request,
        `module 只允许 ${ALLOWED_MODULES.join(" / ")}`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return paramInvalid(
        request,
        `文件「${file.name}」超过 ${MAX_FILE_SIZE_MB}MB，请压缩后重试`,
      );
    }
    // 浏览器没识别出类型时 file.type 会是空串，一并挡在这里
    if (!ALLOWED_TYPES.includes(file.type)) {
      return paramInvalid(request, "仅支持 JPG / PNG / WebP / PDF 格式的文件");
    }

    await validateUpload(file, DEFAULT_UPLOAD_POLICY);

    // 重新组装 FormData：只放行 file，不把前端多余的字段一起透传给后端
    const outbound = new FormData();
    outbound.append("file", file);

    const headersList = request.headers;
    const clientIP = clientIp(request);

    const response = await backendFetch(
      `/web/files/upload?module=${uploadModule}`,
      {
        method: "POST",
        // 不要自己写 Content-Type：FormData 需要由运行时补 multipart boundary
        headers: {
          "X-Forwarded-For": clientIP,
          "User-Agent": headersList.get("user-agent") || "",
          "x-source-type": "portal-web",
          "x-trace-id": request.headers.get("x-trace-id") || "",
        },
        body: outbound,
      },
    );

    const payload = await response.json().catch(() => null);
    const bizCode = readBizCode(payload);

    // §1.3：业务失败也可能是 HTTP 200，成败必须看 body.code
    if (!response.ok || (bizCode !== null && bizCode !== BIZ_CODE_OK)) {
      return apiJson(
        request,
        {
          code: bizCode ?? response.status,
          message: "文件上传失败，请稍后重试",
        },
        { status: response.status },
      );
    }

    return apiJson(request, payload);
  } catch (error) {
    return mutationFailure(error, request);
  }
}
