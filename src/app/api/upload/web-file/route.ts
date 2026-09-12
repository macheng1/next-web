import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { BIZ_CODE_OK, readBizCode } from "@/src/lib/api-envelope";

/**
 * web 端文件上传 BFF：`POST /api/upload/web-file`
 *   → 后端 `POST ${API_URL}/web/files/upload?module=...`
 *
 * **为什么需要它**：企业注册要提交营业执照（`POST /web/members/register` 的
 * `businessLicenseUrl`），而注册时**还没有账号** —— 后端为这个场景单开了一个
 * **公开**上传口（不挂守卫），本路由就是它的转发层：后端地址只留在服务端，
 * 前端调相对路径（与 `/api/portal/*`、`/api/auth/*` 同一套约定）。
 *
 * ⚠️ **后端契约来自 wx-backend，改前先读** `docs/api-fields.md` §7.5a：
 * - `multipart/form-data`，字段名固定 `file`；
 * - `module` 只允许 `enterprise-license`（默认）/ `enterprise`，其他值一律 10003
 *   （匿名可写，白名单是为了不让人往共享 bucket 的任意目录塞文件）；
 * - 单文件 ≤ 10MB；MIME 白名单 `image/jpeg` / `image/png` / `image/webp` / `application/pdf`
 *   （= 全局 `UPLOAD_MAX_FILE_SIZE_MB` / `UPLOAD_ALLOWED_TYPES`）；
 * - 同 IP 60 秒 20 次 → HTTP 429 + 40029；
 * - 返回 `{ originalName, objectKey, url, size }`，`url` 直接填进 `businessLicenseUrl`。
 *
 * 这里只做**形状**校验（有没有文件 / 大小 / MIME / module 白名单），
 * 业务判断与真正的存储都交给后端；校验失败也返回 `{ code, message }` 信封，
 * 与后端保持同一种「成败看 body.code」的读法，前端不必为上传单独写一套解析。
 */

const ALLOWED_MODULES = ["enterprise-license", "enterprise"] as const;
const DEFAULT_MODULE: (typeof ALLOWED_MODULES)[number] = "enterprise-license";

/** 与后端 `UPLOAD_MAX_FILE_SIZE_MB` 默认值一致 */
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

/** 与后端 `UPLOAD_ALLOWED_TYPES` 默认值一致 */
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/** 后端 ErrorCode.PARAM_INVALID —— 本仓其它 BFF 也用同一个码表达「参数/形状不对」 */
const PARAM_INVALID = 10003;

function paramInvalid(message: string) {
  return NextResponse.json({ code: PARAM_INVALID, message }, { status: 400 });
}

function isAllowedModule(value: string): value is (typeof ALLOWED_MODULES)[number] {
  return (ALLOWED_MODULES as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  try {
    // 会员侧接口（企业资质上传）指向 wx-backend；门户访客附件走 `/api/upload/fileList`
    // → API_URL（m-wms-backend）。两者是不同后端，别混用。详见 .env.example。
    const apiUrl = process.env.MEMBER_API_URL || process.env.API_URL;
    if (!apiUrl) {
      console.error(
        "Upload route error: MEMBER_API_URL / API_URL is not configured",
      );
      return NextResponse.json({ message: "服务器配置错误" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    // 变量不叫 `module`：Next 的 no-assign-module-variable 规则会拦（会与打包器变量混淆）
    const uploadModule =
      String(formData.get("module") ?? "").trim() || DEFAULT_MODULE;

    if (!(file instanceof File) || file.size === 0) {
      return paramInvalid("请选择要上传的文件");
    }
    if (!isAllowedModule(uploadModule)) {
      return paramInvalid(`module 只允许 ${ALLOWED_MODULES.join(" / ")}`);
    }
    if (file.size > MAX_FILE_SIZE) {
      return paramInvalid(
        `文件「${file.name}」超过 ${MAX_FILE_SIZE_MB}MB，请压缩后重试`,
      );
    }
    // 浏览器没识别出类型时 file.type 会是空串，一并挡在这里
    if (!ALLOWED_TYPES.includes(file.type)) {
      return paramInvalid("仅支持 JPG / PNG / WebP / PDF 格式的文件");
    }

    // 重新组装 FormData：只放行 file，不把前端多余的字段一起透传给后端
    const outbound = new FormData();
    outbound.append("file", file);

    const headersList = await headers();
    const clientIP =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";

    const response = await fetch(
      `${apiUrl}/web/files/upload?module=${encodeURIComponent(uploadModule)}`,
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
      return NextResponse.json(
        payload ?? { message: "文件上传失败，请稍后重试" },
        { status: response.status },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { message: "服务器错误，请稍后重试" },
      { status: 500 },
    );
  }
}
