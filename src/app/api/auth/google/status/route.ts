import { NextRequest } from "next/server";
import { proxyGoogle } from "@/src/lib/server/google-proxy";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) { return proxyGoogle(request, "status"); }
