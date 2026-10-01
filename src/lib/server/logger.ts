import "server-only";
export interface LogEvent {
  level: "info" | "warn" | "error";
  name: "request_failed" | "health_failed" | "application_error";
  traceId?: string;
  durationMs?: number;
  status?: number;
  errorKind?: string;
}
export function logEvent(event: LogEvent): void {
  const safe: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: event.level,
    name: ["request_failed", "health_failed", "application_error"].includes(
      event.name,
    )
      ? event.name
      : "application_error",
  };
  if (event.traceId && /^[0-9a-f-]{36}$/i.test(event.traceId))
    safe.traceId = event.traceId;
  if (typeof event.durationMs === "number" && Number.isFinite(event.durationMs))
    safe.durationMs = Math.max(0, event.durationMs);
  if (typeof event.status === "number" && Number.isInteger(event.status))
    safe.status = event.status;
  if (
    [
      "network",
      "timeout",
      "aborted",
      "http",
      "business",
      "configuration",
    ].includes(event.errorKind || "")
  )
    safe.errorKind = event.errorKind;
  console[
    event.level === "error" ? "error" : event.level === "warn" ? "warn" : "info"
  ](JSON.stringify(safe));
}
