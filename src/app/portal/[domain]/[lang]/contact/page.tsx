import { portalPageMetadata } from "@/src/lib/server/portal-metadata";
import { ContactUsContent } from "@/src/components/ContactUsContent";
import { fetchTenantData } from "@/src/lib/server/portal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; lang: string }>;
}) {
  return portalPageMetadata(params, "contact");
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
