/** Only same-site destinations; authentication endpoints must never become return targets. */
export function safeReturnTo(value: string | null | undefined): string {
  if (
    typeof value !== "string" ||
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return "/account";
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/account";
  }
  if (
    decoded.startsWith("//") ||
    /[\\\x00-\x20]/.test(decoded) ||
    /%2f|%5c/i.test(decoded)
  )
    return "/account";
  const url = new URL(decoded, "https://site.invalid");
  if (
    url.origin !== "https://site.invalid" ||
    /^\/(?:login|register|forgot-password|reset-password|google|api)(?:\/|$)/.test(
      url.pathname,
    )
  )
    return "/account";
  return value;
}
