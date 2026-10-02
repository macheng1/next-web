import { backendRequest } from "@/src/lib/server/backend";
import { apiJson } from "@/src/lib/server/api-response";
import { HttpError } from "@/src/lib/http/types";
import { catalogQuery, isCatalogPath } from "@/src/lib/catalog/model";
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const target = path.join("/");
  if(!isCatalogPath(target)) return apiJson(request,{code:404},{status:404});
  const query = catalogQuery(new URL(request.url).searchParams);
  try {
    const data = await backendRequest(
      `/web/catalog/${target}${query ? "?" + query : ""}`,
    );
    return apiJson(request, { code: 200, data });
  } catch (error) {
    const status =
      error instanceof HttpError && [400, 404, 429].includes(error.status || 0)
        ? error.status!
        : 503;
    return apiJson(request, { code: status }, { status });
  }
}
