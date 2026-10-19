import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/server/session";
import { AccountProfileForm } from "@/src/components/auth/AccountProfileForm";
import { AuthUnavailable } from "@/src/components/auth/AccountView";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getSession();
  if (session.status === "unavailable") return <AuthUnavailable />;
  if (session.status !== "authenticated")
    redirect("/login?reason=expired&returnTo=%2Faccount%2Fprofile");
  if (session.member.mustChangePassword) redirect("/account/password");
  return <AccountProfileForm member={session.member} />;
}
