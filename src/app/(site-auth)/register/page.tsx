import { RegisterForm } from "@/src/components/auth/RegisterForm";
import { getServerConfig } from "@/src/lib/server/config";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; reason?: string; token?: string }>;
}) {
  const params = await searchParams;
  return <RegisterForm returnTo={params.returnTo} googleAvailable={Boolean(getServerConfig().google)} />;
}
