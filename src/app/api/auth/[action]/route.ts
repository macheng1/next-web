import { NextRequest } from "next/server";
import { apiJson } from "@/src/lib/server/api-response";
import { proxySiteAuth } from "@/src/lib/server/site-auth-proxy";
const actions = {
  login: "login",
  "forgot-password": "forgot",
  "reset-password": "reset",
  "change-password": "password",
} as const;
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!(action in actions))
    return apiJson(request, { code: 404 }, { status: 404 });
  return proxySiteAuth(request, actions[action as keyof typeof actions]);
}
