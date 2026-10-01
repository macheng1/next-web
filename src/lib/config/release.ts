import { parseServerConfig, ConfigurationError } from "./schema";
export interface ProtectionEvidence {
  mode: string;
  verifiedAt: string;
  evidenceReference: string;
}
export function validateProductionEnvironment(
  env: Record<string, string | undefined>,
  evidence?: ProtectionEvidence,
): string[] {
  const missing: string[] = [];
  try {
    parseServerConfig({ ...env, DEPLOYMENT_ENV: "production" });
  } catch (error) {
    missing.push(
      error instanceof ConfigurationError
        ? error.message.split(": ").pop()!
        : "configuration",
    );
  }
  for (const key of ["NEXT_PUBLIC_SITE_URL", "MEMBER_API_URL"])
    if (!env[key] && !missing.includes(key)) missing.push(key);
  if (!["gateway", "backend"].includes(env.RATE_LIMIT_MODE || ""))
    missing.push("RATE_LIMIT_MODE");
  const timestamp = Date.parse(evidence?.verifiedAt || "");
  if (
    !evidence ||
    evidence.mode !== env.RATE_LIMIT_MODE ||
    !evidence.evidenceReference?.trim() ||
    !Number.isFinite(timestamp) ||
    timestamp > Date.now() ||
    Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000
  )
    missing.push("RATE_LIMIT_VERIFICATION_FILE");
  return missing;
}
