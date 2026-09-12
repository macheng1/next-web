/**
 * 文件上传接口层（客户端）。
 *
 * 与 `auth-api.ts` 同一套路：前端只调 BFF 相对路径 `/api/upload/web-file`，
 * 真实后端路径（`/web/files/upload`）只留在 `src/app/api/upload/web-file/route.ts`。
 *
 * 后端契约：wx-backend `docs/api-fields.md` §7.5a（公开接口，无需登录）——
 * 之所以能匿名调，是因为企业注册时**还没有账号**，而营业执照要在提交注册申请时一并交上去。
 *
 * 错误语义直接复用 `auth-api.ts` 的 `AuthError`（`code: network | business`），
 * 表单那边的 `resolveAuthError()` 不用改就能处理上传失败的提示文案。
 */

import { AuthError } from "./auth-api";
import {
  BIZ_CODE_OK,
  generateTraceId,
  pickMessage,
  readBizCode,
} from "./api-envelope";

/** 后端上传成功后返回的文件信息（`url` 直接填进 `businessLicenseUrl`） */
export interface UploadedFile {
  /** 原始文件名，后端已做 UTF-8 修正（中文名正常） */
  originalName: string;
  /** OSS 内部 key，形如 `development/enterprise-license/2026/09/12/xxx.png` */
  objectKey: string;
  /** 可直接访问的地址（已拼 CDN 域名） */
  url: string;
  /** 文件字节数 */
  size: number;
}

/** 公开上传口允许写入的目录（后端白名单，传其他值一律 10003） */
export type UploadModule = "enterprise-license" | "enterprise";

/** 与后端 §7.5a 一致：单文件 ≤ 10MB */
export const MAX_UPLOAD_SIZE_MB = 10;

/** 与后端 §7.5a 一致：JPG / PNG / WebP / PDF —— 直接喂给 `<input type="file" accept>` */
export const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

/**
 * 图片扩展名判定（URL 带 query / hash 也算，如 `...jpg?x-oss-process=style/thumb`）。
 * 上传口允许 PDF，所以「能不能出缩略图」必须先问一句是不是图片。
 */
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp|avif|svg)(?:[?#]|$)/i;

/** 已上传文件的 URL 是否指向图片（决定给缩略图还是给一个「新窗口打开」） */
export function isImageUrl(url: string): boolean {
  return IMAGE_EXT_RE.test(url);
}

/** 待上传的文件是不是图片（本地即时预览用，不依赖远端 URL 能否回源） */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT_RE.test(file.name);
}

/** 人类可读的文件大小（上传结果里回显用） */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export interface UploadWebFileOptions {
  /**
   * 业务目录，默认 `enterprise-license`（营业执照）。
   * 登录后的企业资料/产品图走 `enterprise`。
   */
  module?: UploadModule;
  /** 后端没给出原因时展示的兜底文案（由调用方从字典传入） */
  fallbackMessage: string;
}

/**
 * 上传单个文件（公开接口，不要求登录）。
 *
 * 大小 / 格式的具体判定在 BFF 与后端各有一道（前端不必再写第三套规则），
 * 这里只把后端（或 BFF）返回的 `message` 原样带出来。
 */
export async function uploadWebFile(
  file: File,
  { module, fallbackMessage }: UploadWebFileOptions,
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  if (module) formData.append("module", module);

  let response: Response;
  try {
    response = await fetch("/api/upload/web-file", {
      method: "POST",
      headers: {
        "x-trace-id": generateTraceId(),
        "x-source-type": "portal-web",
      },
      // 不要手动设 Content-Type：multipart 的 boundary 必须由运行时生成
      body: formData,
    });
  } catch {
    throw new AuthError("network", fallbackMessage);
  }

  const body = await response.json().catch(() => null);
  const bizCode = readBizCode(body);

  // §1.3：业务失败也可能是 HTTP 200，成败必须看 body.code
  if (!response.ok || (bizCode !== null && bizCode !== BIZ_CODE_OK)) {
    throw new AuthError(
      "business",
      pickMessage(body, fallbackMessage),
      response.status,
      bizCode ?? undefined,
    );
  }

  const data = (body as { data?: UploadedFile } | null)?.data;
  if (!data?.url) {
    // 响应结构不对（比如被网关改写）：当业务失败处理，别把 undefined 塞进表单
    throw new AuthError("business", fallbackMessage, response.status, bizCode ?? undefined);
  }
  return data;
}
