import { RegisterForm } from "@/src/components/auth/RegisterForm";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; reason?: string; token?: string }>;
}) {
  const params = await searchParams;
  return <RegisterForm returnTo={params.returnTo} />;
}
