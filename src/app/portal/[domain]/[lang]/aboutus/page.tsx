// src/app/portal/[domain]/[lang]/about/page.tsx

import { AboutUsContent } from "@/src/components/AboutUsContent";
import { fetchTenantData } from "@/src/lib/server/portal";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const data = await fetchTenantData(domain);
  return {
    title: `关于我们 - ${data?.name}`,
    description: data?.intro,
  };
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
