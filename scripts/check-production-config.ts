import { readFileSync } from "node:fs";
import {
  validateProductionEnvironment,
  type ProtectionEvidence,
} from "../src/lib/config/release";
let evidence: ProtectionEvidence | undefined;
try {
  if (process.env.RATE_LIMIT_VERIFICATION_FILE)
    evidence = JSON.parse(
      readFileSync(process.env.RATE_LIMIT_VERIFICATION_FILE, "utf8"),
    );
} catch {}
const missing = validateProductionEnvironment(process.env, evidence);
if (missing.length) {
  console.error(
    `Production verification missing or invalid: ${missing.join(", ")}`,
  );
  process.exitCode = 1;
} else
  console.info(
    "Production configuration valid; live deployment checks still required.",
  );
