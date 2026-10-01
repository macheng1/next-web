import { enterpriseClientHeaders } from "@/src/lib/server/enterprise-client-ip";
import {
  guardMutation,
  readJsonBody,
  mutationFailure,
} from "@/src/lib/server/mutation";
import { backendFetch } from "@/src/lib/server/backend";
import { apiJson } from "@/src/lib/server/api-response";
import { enterpriseResponse } from "@/src/lib/server/enterprise-onboarding";
import {
  normalizeEnterprise,
  validSubmission,
} from "@/src/lib/enterprise-onboarding/model";
export async function POST(request: Request) {
  try {
    await guardMutation(request);
    const body = await readJsonBody(request);
    if (!body || !validSubmission(body))
      return apiJson(request, { errorKey: "invalid_input" }, { status: 400 });
    return enterpriseResponse(
      request,
      await backendFetch("/web/enterprise-applications", {
        method: "POST",
        headers: {
          ...enterpriseClientHeaders(request),
          "content-type": "application/json",
          "x-trace-id": request.headers.get("x-trace-id") || "",
        },
        body: JSON.stringify({
          ...normalizeEnterprise(body),
          requestId: body.requestId,
          countryCode: "CN",
          smsCode: body.smsCode,
          businessLicenseUrl: body.businessLicenseUrl,
          agreementAccepted: true,
        }),
      }),
    );
  } catch (error) {
    return mutationFailure(error, request);
  }
}
