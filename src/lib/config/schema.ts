export type DeploymentEnv = "local" | "development" | "test" | "production";
export interface ServerConfig {
  memberApiUrl?: string;
  siteUrl: string;
  deploymentEnv: DeploymentEnv;
  trustedOrigins: string[];
  trustProxy: boolean;
  rateLimitMode?: "memory" | "gateway" | "backend";
  rateLimitVerificationFile?: string;
  devAllowedOrigins: string[];
  google?: { clientId: string; redirectUri: string };
}
export class ConfigurationError extends Error {
  constructor(key: string) {
    super(`Invalid or missing configuration: ${key}`);
    this.name = "ConfigurationError";
  }
}
function address(
  value: string,
  key: string,
  production: boolean,
  originOnly = false,
): string {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (production && url.protocol !== "https:") ||
      (originOnly && url.pathname !== "/")
    )
      throw new Error();
    return originOnly ? url.origin : url.toString().replace(/\/+$/, "");
  } catch {
    throw new ConfigurationError(key);
  }
}
export function parseServerConfig(
  env: Record<string, string | undefined>,
): ServerConfig {
  const rawEnv =
    env.DEPLOYMENT_ENV ||
    (env.NODE_ENV === "production"
      ? "production"
      : env.NODE_ENV === "test"
        ? "test"
        : "development");
  if (!["local", "development", "test", "production"].includes(rawEnv))
    throw new ConfigurationError("DEPLOYMENT_ENV");
  const deploymentEnv = rawEnv as DeploymentEnv;
  const production = deploymentEnv === "production";
  const rawSite =
    env.NEXT_PUBLIC_SITE_URL || (production ? "" : "http://localhost:3000");
  const siteUrl = address(rawSite, "NEXT_PUBLIC_SITE_URL", production, true);
  const extraOrigins = (env.TRUSTED_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => address(v, "TRUSTED_ORIGINS", production, true));
  const proxy = env.TRUST_PROXY?.trim() || "false";
  if (!["true", "false"].includes(proxy)) throw new ConfigurationError("TRUST_PROXY");
  const rateLimitMode = env.RATE_LIMIT_MODE?.trim() || undefined;
  if (rateLimitMode && !["memory", "gateway", "backend"].includes(rateLimitMode))
    throw new ConfigurationError("RATE_LIMIT_MODE");
  const devAllowedOrigins = (env.DEV_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
  if (devAllowedOrigins.some(value => !/^[a-zA-Z0-9.*:-]+$/.test(value)))
    throw new ConfigurationError("DEV_ALLOWED_ORIGINS");
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  if (clientId && !/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId))
    throw new ConfigurationError("GOOGLE_CLIENT_ID");
  if (!clientId && env.GOOGLE_REDIRECT_URI?.trim()) throw new ConfigurationError("GOOGLE_CLIENT_ID");
  const callback = new URL("/api/auth/google/callback", siteUrl);
  const redirectUri = clientId ? address(env.GOOGLE_REDIRECT_URI?.trim() || callback.toString(), "GOOGLE_REDIRECT_URI", production) : undefined;
  if (redirectUri && redirectUri !== callback.toString()) throw new ConfigurationError("GOOGLE_REDIRECT_URI");
  return {
    deploymentEnv,
    trustProxy: proxy === "true",
    rateLimitMode: rateLimitMode as ServerConfig["rateLimitMode"],
    rateLimitVerificationFile: env.RATE_LIMIT_VERIFICATION_FILE?.trim() || undefined,
    devAllowedOrigins,
    google: clientId ? { clientId, redirectUri: redirectUri! } : undefined,
    siteUrl,
    trustedOrigins: [...new Set([siteUrl, ...extraOrigins])],
    memberApiUrl: env.MEMBER_API_URL
      ? address(env.MEMBER_API_URL, "MEMBER_API_URL", production)
      : undefined,
  };
}
