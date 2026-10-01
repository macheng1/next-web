import { backendFetch } from "@/src/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

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
    const headersList = await headers();
    const clientIP =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";

    const formData = await request.formData();
    const files = formData.getAll("file");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
    }
    if (files.length > MAX_FILE_COUNT) {
      return NextResponse.json(
        { error: "单次最多上传 6 个文件" },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const extension = file.name.includes(".")
        ? `.${file.name.split(".").pop()?.toLowerCase()}`
        : "";
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `文件 "${file.name}" 超过 5MB 限制` },
          { status: 400 },
        );
      }
      if (
        !ALLOWED_TYPES.includes(file.type) ||
        !ALLOWED_EXTENSIONS.includes(extension)
      ) {
        return NextResponse.json(
          { error: `不支持的文件类型: ${file.name}` },
          { status: 400 },
        );
      }
    }

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      return NextResponse.json(
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
      
      return NextResponse.json(
        { error: "文件上传失败，请稍后重试" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 },
    );
  }
}
