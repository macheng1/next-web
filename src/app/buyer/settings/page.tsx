import { AccountSettings } from "@/src/components/buyer/AccountSettings";
import { getServerConfig } from "@/src/lib/server/config";
export default async function Page({searchParams}:{searchParams:Promise<{reason?:string}>}) {
  const {reason}=await searchParams;
  return <AccountSettings googleAvailable={Boolean(getServerConfig().google)} reason={reason} />;
}
