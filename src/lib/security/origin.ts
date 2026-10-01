export class SecurityError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
    this.name = "SecurityError";
  }
}
export function assertTrustedOrigin(
  request: Request,
  origins: readonly string[],
): void {
  const value = request.headers.get("origin");
  if (!value || !origins.includes(value))
    throw new SecurityError(403, "untrusted_origin");
}
