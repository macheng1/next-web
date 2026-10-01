export interface SecurityHeaderOptions {
  production: boolean;
  nonce?: string;
  https?: boolean;
}
export function buildSecurityHeaders({
  production,
  nonce,
  https = false,
}: SecurityHeaderOptions): Array<{ key: string; value: string }> {
  if (nonce && !/^[A-Za-z0-9+/=_-]+$/.test(nonce))
    throw new Error("Invalid nonce");
  const script = production
    ? nonce
      ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
      : "'none'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";
  const csp = [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://macheng123.oss-cn-hangzhou.aliyuncs.com",
    "media-src 'self' https://macheng123.oss-cn-hangzhou.aliyuncs.com",
    "font-src 'self' data:",
    `connect-src 'self'${production ? "" : " ws: http://localhost:*"}`,
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const result = [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "geolocation=(self), microphone=(), camera=()",
    },
  ];
  if (production && https)
    result.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    });
  return result;
}
