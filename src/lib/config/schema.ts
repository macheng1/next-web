export type DeploymentEnv = "development" | "test" | "production";
export interface ServerConfig {
  portalApiUrl?: string;
  memberApiUrl?: string;
  siteUrl: string;
  deploymentEnv: DeploymentEnv;
  trustedOrigins: string[];
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
  if (!["development", "test", "production"].includes(rawEnv))
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
  return {
    deploymentEnv,
    siteUrl,
    trustedOrigins: [...new Set([siteUrl, ...extraOrigins])],
    portalApiUrl: env.API_URL
      ? address(env.API_URL, "API_URL", production)
      : undefined,
    memberApiUrl: env.MEMBER_API_URL
      ? address(env.MEMBER_API_URL, "MEMBER_API_URL", production)
      : undefined,
  };
}
