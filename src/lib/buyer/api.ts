import { uploadRetryKey } from "./upload-retry";
import { requestJson } from "../http/request";
import type { Attachment } from "./types";
export const buyerApi = {
  get: <T>(path: string, signal?: AbortSignal) =>
    requestJson<T>("/api/buyer/" + path, { signal }),
  write: <T>(
    path: string,
    body: unknown,
    key = crypto.randomUUID(),
    method: "POST" | "PUT" = "POST",
    expectedMember?: string,
  ) =>
    requestJson<T>("/api/buyer/" + path, {
      method,
      headers: {
        "content-type": "application/json",
        "idempotency-key": key,
        ...(expectedMember ? { "x-expected-member-id": expectedMember } : {}),
      },
      body: JSON.stringify(body),
    }),
  upload: async (
    file: File,
    purpose: "inquiry" | "message",
    resourceId?: string,
    expectedMember?: string,
  ): Promise<Attachment> => {
    if (
      file.size > 10 * 1024 * 1024 ||
      !file.size ||
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      )
    )
      throw Error("FILE_NOT_ALLOWED");
    const body = new FormData();
    body.set("file", file);
    body.set("purpose", purpose);
    if (resourceId) {
      body.set("resourceType", "inquiry");
      body.set("resourceId", resourceId);
    }
    const retry = await uploadRetryKey(
      file,
      expectedMember || "",
      purpose,
      resourceId,
    );
    const result = await requestJson<Attachment>("/api/buyer/files", {
      method: "POST",
      headers: {
        "idempotency-key": retry.key,
        ...(expectedMember ? { "x-expected-member-id": expectedMember } : {}),
      },
      body,
    });
    if (!result?.id) throw Error("INVALID_UPLOAD_RESPONSE");
    retry.acknowledge();
    return result;
  },
};
