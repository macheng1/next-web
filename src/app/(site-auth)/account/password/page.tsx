import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/server/session";
import { ChangePasswordForm } from "@/src/components/auth/ChangePasswordForm";
import { AuthUnavailable } from "@/src/components/auth/AccountView";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getSession();
  if (session.status === "unavailable") return <AuthUnavailable />;
  if (session.status !== "authenticated")
    redirect("/login?reason=expired&returnTo=%2Faccount%2Fpassword");
  return <ChangePasswordForm forced={session.member.mustChangePassword} />;
}
