import { NextRequest } from "next/server";
import { proxySiteAuth } from "@/src/lib/server/site-auth-proxy";
export async function POST(request: NextRequest) {
  return proxySiteAuth(request, "sendCode");
}
