import { NextRequest } from "next/server";
import { startGoogleAuthorization } from "@/src/lib/server/google-authorization";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return startGoogleAuthorization(request);
}
