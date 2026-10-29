import { NextRequest } from "next/server";
import { finishGoogleAuthorization } from "@/src/lib/server/google-authorization";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return finishGoogleAuthorization(request);
}
