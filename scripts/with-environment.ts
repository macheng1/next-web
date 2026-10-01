import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import {
  ENVIRONMENT_PROFILES,
  resolveEnvironmentProfile,
  type EnvironmentProfile,
} from "../src/lib/config/profile";
import {
  validateProductionEnvironment,
  type ProtectionEvidence,
} from "../src/lib/config/release";
const [profile, action, ...args] = process.argv.slice(2);
try {
  if (
    !ENVIRONMENT_PROFILES.includes(profile as EnvironmentProfile) ||
    !["dev", "build", "start", "check"].includes(action)
  )
    throw new Error(
      "Usage: with-environment local|development|production dev|build|start|check",
    );
  if (profile === "production" && action === "dev")
    throw new Error("生产环境请使用 build/start");
  const location = resolve("config/environments", `${profile}.env`);
  const template = location + ".example";
  const env = resolveEnvironmentProfile(
    profile as EnvironmentProfile,
    readFileSync(existsSync(location) ? location : template, "utf8"),
    process.env,
  );
  if (profile === "production") {
    let evidence: ProtectionEvidence | undefined;
    try {
      if (env.RATE_LIMIT_VERIFICATION_FILE)
        evidence = JSON.parse(
          readFileSync(env.RATE_LIMIT_VERIFICATION_FILE, "utf8"),
        );
    } catch {}
    const missing = validateProductionEnvironment(env, evidence);
    if (missing.length)
      throw new Error(`生产发布配置缺失或无效：${missing.join(", ")}`);
  }
  console.info(`环境：${profile}；构建目录：${env.NEXT_DIST_DIR}`);
  if (action !== "check") {
    const child = spawn(
      process.execPath,
      [resolve("node_modules/next/dist/bin/next"), action, ...args],
      { env: { ...env, NODE_ENV: action === "dev" ? "development" : "production" }, stdio: "inherit" },
    );
    for (const signal of ["SIGINT", "SIGTERM"] as const)
      process.on(signal, () => child.kill(signal));
    child.on("error", () => {
      console.error("无法启动 Next.js");
      process.exitCode = 1;
    });
    child.on("exit", (code, signal) => {
      process.exitCode = code ?? (signal ? 1 : 0);
    });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "环境配置读取失败");
  process.exitCode = 1;
}
