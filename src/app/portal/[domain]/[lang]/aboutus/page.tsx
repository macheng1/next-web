import { portalPageMetadata } from "@/src/lib/server/portal-metadata";
// src/app/portal/[domain]/[lang]/about/page.tsx

import { AboutUsContent } from "@/src/components/AboutUsContent";
import { fetchTenantData } from "@/src/lib/server/portal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; lang: string }>;
}) {
  return portalPageMetadata(params, "aboutus");
}

export default async function AboutUsPage({
  params,
}: {
  params: Promise<{ domain: string; lang: string }>;
}) {
  const { domain } = await params;
  const data = await fetchTenantData(domain);

  if (!data) return <div className="p-20 text-center">信息加载中...</div>;

  return (
    <div className="bg-[#f4f6f8] min-h-screen">
      <AboutUsContent data={data} />
    </div>
  );
}
