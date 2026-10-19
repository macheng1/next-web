import { LoginForm } from "@/src/components/auth/LoginForm";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; reason?: string; token?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm returnTo={params.returnTo} reason={params.reason} />;
}
