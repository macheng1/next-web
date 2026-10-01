import "server-only";
import { isIP } from "node:net";
/** Only enable behind a gateway that replaces X-Real-IP and blocks direct access. */
export function enterpriseClientHeaders(
  request: Request,
): Record<string, string> {
  if (process.env.TRUST_PROXY !== "true") return {};
  const ip = request.headers.get("x-real-ip")?.trim();
  return ip && isIP(ip) ? { "x-real-ip": ip } : {};
}
