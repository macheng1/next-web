/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchResponse as request } from "./http/request";
/**
 * 提交询价表单（先走 Next API 完成人机校验，再转发后端）
 */
export const submitInquiry = async (domain: string, values: any) => {
  return await request(`/api/portal/${domain}/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
};

/**
 * 上传官网询盘附件，经 Next API 转发到后端公共附件上传入口。
 */
export const uploadFiles = async (files: File | File[]): Promise<any> => {
  const formData = new FormData();

  if (Array.isArray(files)) {
    files.forEach((file) => formData.append("file", file));
  } else {
    formData.append("file", files);
  }

  const response = await request("/api/upload/fileList", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || (payload.code != null && Number(payload.code) !== 200)) throw new Error(payload.message || payload.error || "Upload failed");
  return payload;
};
