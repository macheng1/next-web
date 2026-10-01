import {
  guardMutation,
  readJsonBody,
  mutationFailure,
} from "@/src/lib/server/mutation";
import { backendFetch } from "@/src/lib/server/backend";
import { apiJson } from "@/src/lib/server/api-response";
import { enterpriseResponse } from "@/src/lib/server/enterprise-onboarding";
export async function POST(request: Request) {
  try {
    await guardMutation(request);
    const body = await readJsonBody(request);
    if (
      !body ||
      Object.keys(body).some((key) => key !== "phone") ||
      typeof body.phone !== "string" ||
      !/^1[3-9]\d{9}$/.test(body.phone)
    )
      return apiJson(request, { errorKey: "invalid_input" }, { status: 400 });
    return enterpriseResponse(
      request,
      await backendFetch("/sms/send-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: body.phone, scene: "register" }),
      }),
    );
  } catch (error) {
    return mutationFailure(error, request);
  }
}
