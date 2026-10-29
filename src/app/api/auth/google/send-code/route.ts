import { NextRequest } from "next/server";
import { proxyGoogle } from "@/src/lib/server/google-proxy";
export const dynamic = "force-dynamic";
export function POST(request: NextRequest) { return proxyGoogle(request, "send-code"); }
