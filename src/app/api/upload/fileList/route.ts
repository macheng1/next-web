import { apiJson } from "@/src/lib/server/api-response";
import { validateUpload, INQUIRY_UPLOAD_POLICY } from "@/src/lib/security/upload";
import { clientIp, guardMutation, readFormBody, mutationFailure } from "@/src/lib/server/mutation";
import { backendFetch } from "@/src/lib/server/backend";
import { NextRequest } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_COUNT = 6;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/dwg",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
];
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".dwg",
  ".zip",
];

export async function POST(request: NextRequest) {
  try {
    await guardMutation(request);
    const headersList = request.headers;
    const clientIP = clientIp(request);

    const formData = await readFormBody(request, 31 * 1024 * 1024);
    const files = formData.getAll("file");

    if (!files || files.length === 0) {
      return apiJson(request, { error: "请选择要上传的文件" }, { status: 400 });
    }
    if (files.length > MAX_FILE_COUNT) {
      return apiJson(request, 
        { error: "单次最多上传 6 个文件" },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (!(file instanceof File)) return apiJson(request, {error: "Invalid file"}, {status:400});
      await validateUpload(file, INQUIRY_UPLOAD_POLICY);

      const extension = file.name.includes(".")
        ? `.${file.name.split(".").pop()?.toLowerCase()}`
        : "";
      if (file.size > MAX_FILE_SIZE) {
        return apiJson(request, 
          { error: `文件 "${file.name}" 超过 5MB 限制` },
          { status: 400 },
        );
      }
      if (
        !ALLOWED_TYPES.includes(file.type) ||
        !ALLOWED_EXTENSIONS.includes(extension)
      ) {
        return apiJson(request, 
          { error: `不支持的文件类型: ${file.name}` },
          { status: 400 },
        );
      }
    }

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      return apiJson(request, 
        { error: "服务器配置错误，请联系管理员" },
        { status: 500 },
      );
    }

    const response = await backendFetch("portal", "/upload/public/fileList", {
      method: "POST",
      headers: {
        "X-Forwarded-For": clientIP,
        "User-Agent": headersList.get("user-agent") || "",
        "x-source-type": "portal-web",
      },
      body: formData,
    });

    if (!response.ok) {
      
      return apiJson(request, 
        { error: "文件上传失败，请稍后重试" },
        { status: response.status },
      );
    }

    const data = await response.json();
    if (data?.code != null && Number(data.code) !== 200) return apiJson(request, {code: data.code, message: "Upload failed"}, {status:400});
    return apiJson(request, data);
  } catch (error) {
    return mutationFailure(error, request);
  }
}
