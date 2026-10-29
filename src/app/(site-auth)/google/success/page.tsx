import { GoogleSessionArrival } from "@/src/components/auth/GoogleSessionArrival";
import { safeReturnTo } from "@/src/lib/auth/return-to";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string;
  }>;
}) {
  const { returnTo } = await searchParams;
  return <GoogleSessionArrival returnTo={safeReturnTo(returnTo)} />;
}
