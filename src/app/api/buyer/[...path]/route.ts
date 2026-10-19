import type { NextRequest } from "next/server";
import { buyerProxy } from "@/src/lib/server/buyer-proxy";
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return buyerProxy(request, (await context.params).path);
}
export { handle as GET, handle as POST, handle as PUT };
