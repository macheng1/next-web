import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/server/session";
import { AccountView } from "@/src/components/auth/AccountView";
import { AuthUnavailable } from "@/src/components/auth/AccountView";
import { getServerConfig } from "@/src/lib/server/config";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getSession();
  if (session.status === "unavailable") return <AuthUnavailable />;
  if (session.status !== "authenticated")
    redirect("/login?reason=expired&returnTo=%2Faccount");
  if (session.member.mustChangePassword) redirect("/account/password");
  return <AccountView member={session.member} googleAvailable={Boolean(getServerConfig().google)} />;
}
