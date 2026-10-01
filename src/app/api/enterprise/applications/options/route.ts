import { backendFetch } from "@/src/lib/server/backend";
import { mutationFailure } from "@/src/lib/server/mutation";
import { enterpriseResponse } from "@/src/lib/server/enterprise-onboarding";
export async function GET(request: Request) {
  try {
    return enterpriseResponse(
      request,
      await backendFetch("/web/enterprise-applications/options"),
    );
  } catch (error) {
    return mutationFailure(error, request);
  }
}
