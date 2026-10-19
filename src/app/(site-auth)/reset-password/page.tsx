import { PasswordResetForm } from "@/src/components/auth/PasswordResetForm";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; reason?: string; token?: string }>;
}) {
  const params = await searchParams;
  return <PasswordResetForm token={params.token || ""} />;
}
