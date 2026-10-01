import { parseEnv } from "node:util";
import { parseServerConfig, ConfigurationError } from "./schema";
export const ENVIRONMENT_PROFILES = [
  "local",
  "development",
  "production",
] as const;
export type EnvironmentProfile = (typeof ENVIRONMENT_PROFILES)[number];
export function resolveEnvironmentProfile(
  profile: EnvironmentProfile,
  text: string,
  inherited: Record<string, string | undefined>,
): Record<string, string | undefined> & { DEPLOYMENT_ENV: EnvironmentProfile; NEXT_DIST_DIR: string } {
  const values = parseEnv(text);
  if ("NODE_ENV" in values) throw new ConfigurationError("NODE_ENV");
  if (values.DEPLOYMENT_ENV && values.DEPLOYMENT_ENV !== profile)
    throw new ConfigurationError("DEPLOYMENT_ENV");
  const env: Record<string, string | undefined> = {
    ...values,
    ...Object.fromEntries(
      Object.entries(inherited).filter(([, value]) => value !== undefined),
    ),
    DEPLOYMENT_ENV: profile,
    NEXT_DIST_DIR: `.next-${profile}`,
  };
  if (!env.NEXT_PUBLIC_SITE_URL)
    throw new ConfigurationError("NEXT_PUBLIC_SITE_URL");
  if (!env.MEMBER_API_URL) throw new ConfigurationError("MEMBER_API_URL");
  const config = parseServerConfig(env);
  return {
    ...env,
    MEMBER_API_URL: config.memberApiUrl!,
    NEXT_PUBLIC_SITE_URL: config.siteUrl,
    DEPLOYMENT_ENV: profile,
    NEXT_DIST_DIR: `.next-${profile}`,
  };
}
