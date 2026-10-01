import { ContactUsContent } from "@/src/components/ContactUsContent";
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
    title: `联系我们 - ${data?.name}`,
    description: `欢迎联系${data?.name}，我们将为您提供专业的产品咨询与技术支持。`,
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ domain: string; lang: string }>;
}) {
  const { domain } = await params;
  const data = await fetchTenantData(domain);

  if (!data) return <div className="p-20 text-center">加载中...</div>;

  return (
    <div className="bg-[#f4f6f8] min-h-screen">
      <ContactUsContent data={data} domain={domain} />
    </div>
  );
}
