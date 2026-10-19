import { NextRequest } from "next/server";
import { proxySiteAuth } from "@/src/lib/server/site-auth-proxy";
export async function PUT(request: NextRequest) {
  return proxySiteAuth(request, "profile");
}
