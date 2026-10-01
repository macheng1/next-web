import { buildMetadata } from "@/src/lib/seo/metadata";
import { isLocale } from "@/src/lib/i18n/locale";
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/portal/[domain]/[lang]/layout.tsx
import { NavBar } from "@/src/components/navbar";
import { Footer } from "@/src/components/footer";
import { fetchTenantData } from "@/src/lib/server/portal";
import { getDictionary } from "@/src/dictionaries";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  // 💡 关键修正 1：params 必须定义为 Promise 类型
  params: Promise<{ domain: string; lang: any }>;
}) {
  const { domain, lang } = await params;

  // 💡 并发获取字典和业务数据，提高加载速度
  const [dict, data] = await Promise.all([
    getDictionary(lang),
    fetchTenantData(domain),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 这里的 NavBar 和 Footer 已根据你之前的要求进行了移动端适配 */}
      {data?.navbar && (
        <NavBar {...data.navbar} dict={dict.nav} title={data.name} />
      )}
      <main className="flex-grow">{children}</main>
      {data?.footer && <Footer {...data.footer} />}
    </div>
  );
}

export async function generateMetadata({params}:{params:Promise<{domain:string;lang:string}>}) {
 const {domain,lang}=await params;const locale=isLocale(lang)?lang:"zh";const data=await fetchTenantData(domain);
 const title=typeof data?.name==="string"?data.name:(await getDictionary(locale)).foundation.siteTitle;
 return buildMetadata({title,description:typeof data?.description==="string"?data.description:title,path:`/portal/${encodeURIComponent(domain)}/${locale}`,locale,private:!data,alternates:{zh:`/portal/${encodeURIComponent(domain)}/zh`,en:`/portal/${encodeURIComponent(domain)}/en`}});
}
