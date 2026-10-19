import type { ReactNode } from "react";
import { getSession } from "@/src/lib/server/session";
import { BuyerShell } from "@/src/components/buyer/BuyerShell";
import { BuyerSessionGate } from "@/src/components/buyer/BuyerUI";
import { redirect } from "next/navigation";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export const dynamic = "force-dynamic";
export default async function BuyerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (session.status === "unavailable")
    return <main role="alert">Service unavailable / 服务暂不可用</main>;
  if (session.status !== "authenticated") return <BuyerSessionGate />;
  if (session.member.mustChangePassword) redirect("/account/password");
  return (
    <BuyerShell key={session.member.id} member={session.member}>
      {children}
    </BuyerShell>
  );
}
