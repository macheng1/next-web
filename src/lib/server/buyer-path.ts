const uuid =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const routes: Record<string, RegExp> = {
  GET: new RegExp(
    `^(?:summary|dashboard|options|favorites(?:/(?:enterprise|product)/${uuid})?|notifications(?:/unread-count)?|inquiries(?:/${uuid}(?:/(?:messages|message-receipts|quotes))?)?|quotes/${uuid}|files/${uuid}/access|products/${uuid}|enterprises/${uuid}/products)$`,
    "i",
  ),
  POST: new RegExp(
    `^(?:inquiries(?:/${uuid}/(?:messages|read|close))?|files)$`,
    "i",
  ),
  PUT: new RegExp(
    `^(?:favorites|notifications/(?:read-all|${uuid}/read))$`,
    "i",
  ),
};
export function buyerPath(
  method: string,
  segments: string[],
): `/web/buyer/${string}` {
  const value = segments.join("/");
  if (
    !routes[method]?.test(value) ||
    segments.some((s) => s.includes("/") || s.includes("\\"))
  )
    throw new Error("Unsupported buyer path");
  return `/web/buyer/${value}`;
}
export function isBuyerPath(path: string): boolean {
  const plain = path.split("?")[0];
  if (!plain.startsWith("/web/buyer/")) return false;
  return Object.keys(routes).some((method) => {
    try {
      return buyerPath(method, plain.slice(11).split("/")) === plain;
    } catch {
      return false;
    }
  });
}
