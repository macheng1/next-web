import "server-only";
import type { ServerConfig } from "../config/schema";
import { requestJson } from "../http/request";
export async function checkReadiness(config: ServerConfig): Promise<boolean> {
  if (!config.memberApiUrl) return false;
  const results = await Promise.allSettled(
    [
      config.memberApiUrl,
      ...(config.portalApiUrl ? [config.portalApiUrl] : []),
    ].map((url) =>
      requestJson<{ status?: string }>(`${url}/health`, {
        timeoutMs: 3000,
        redirect: "error",
        cache: "no-store",
      }),
    ),
  );
  return results.every(
    (result) => result.status === "fulfilled" && result.value?.status === "ok",
  );
}
