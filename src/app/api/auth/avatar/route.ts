import { NextRequest } from "next/server";
import {
  guardMutation,
  readFormBody,
  mutationFailure,
} from "@/src/lib/server/mutation";
import { backendFetch } from "@/src/lib/server/backend";
import { siteAuthResponse } from "@/src/lib/server/site-auth-proxy";
import { MEMBER_TOKEN_COOKIE } from "@/src/lib/auth-token";
import { SecurityError } from "@/src/lib/security/origin";
export async function POST(request: NextRequest) {
  try {
    await guardMutation(request);
    const token = request.cookies.get(MEMBER_TOKEN_COOKIE)?.value;
    if (!token) throw new SecurityError(401, "session_expired");
    const form = await readFormBody(request, 2 * 1024 * 1024 + 16 * 1024);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024)
      throw new SecurityError(400, "upload_size");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new SecurityError(400, "invalid_avatar");
    const outbound = new FormData();
    outbound.set("file", file);
    return siteAuthResponse(
      request,
      await backendFetch("/web/site-auth/me/avatar", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: outbound,
      }),
      "avatar",
    );
  } catch (error) {
    return mutationFailure(error, request);
  }
}
