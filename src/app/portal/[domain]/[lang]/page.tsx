import { portalPageMetadata } from "@/src/lib/server/portal-metadata";
// src/app/portal/[domain]/[lang]/page.tsx

import Image from "next/image";
import {
  IconArrowRight,
  IconMail,
  IconMapPin,
  IconPhone,
  IconUser,
} from "@douyinfe/semi-icons";
import { ProductGrid } from "@/src/components/portal/productGrid";
import { JobBoard } from "@/src/components/portal/jobBoard";
import { fetchTenantData } from "@/src/lib/server/portal";

type PortalProduct = {
  id: string;
  name: string;
  material?: string | null;
  diameter?: string | null;
  image?: string | null;
};

type PortalCategory = {
  categoryName: string;
  categoryEn?: string;
  items?: PortalProduct[];
};

type HomeConfig = {
  heroImage?: string | null;
  productDescription?: string | null;
  responseTitle?: string | null;
  responseDescription?: string | null;
  responseItems?: Array<{
    title?: string | null;
    description?: string | null;
  }>;
  jobsDescription?: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; lang: string }>;
}) {
  return portalPageMetadata(params, "home");
}

export default async function PortalHome({
  params,
}: {
  params: Promise<{ domain: string; lang: string }>;
}) {
  const { domain, lang } = await params;
  const data = await fetchTenantData(domain);

  if (!data) return <div className="p-20 text-center">未找到该工厂信息</div>;

  const categories = (data.products || []) as PortalCategory[];
  const homeConfig = (data.homeConfig || {}) as HomeConfig;
  const featuredProducts = categories.flatMap((item) => item.items || []);
  const heroProduct = featuredProducts[0];
  const heroImage = homeConfig.heroImage || heroProduct?.image;
  const isHeroVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(heroImage || "");
  const responseItems = [
    {
      title: homeConfig.responseItems?.[0]?.title || "图纸确认",
      description: homeConfig.responseItems?.[0]?.description || "支持附件询价",
    },
    {
      title: homeConfig.responseItems?.[1]?.title || "规格沟通",
      description:
        homeConfig.responseItems?.[1]?.description || "材料和尺寸确认",
    },
    {
      title: homeConfig.responseItems?.[2]?.title || "批量报价",
      description: homeConfig.responseItems?.[2]?.description || "面向采购场景",
    },
  ];

  const capabilityItems = [
    {
      label: "成立时间",
      value: data.businessInfo?.foundDate
        ? new Date(data.businessInfo.foundDate).getFullYear()
        : "-",
      suffix: data.businessInfo?.foundDate ? "年" : "",
    },
    {
      label: "员工规模",
      value: data.businessInfo?.staffCount || "-",
      suffix: data.businessInfo?.staffCount ? "人" : "",
    },
    {
      label: "年产能",
      value: data.businessInfo?.annualCapacity || "-",
      suffix: "",
    },
    {
      label: "主营产品",
      value: data.businessInfo?.mainProducts || "-",
      suffix: "",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <section className="relative overflow-hidden bg-slate-900 text-white">
        {heroImage &&
          (isHeroVideo ? (
            <video
              className="absolute inset-0 h-full w-full object-cover opacity-58"
              src={heroImage}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <Image
              src={heroImage}
              alt={heroProduct.name || data.name}
              fill
              priority
              className="object-cover opacity-58"
            />
          ))}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.9)_0%,rgba(15,23,42,0.72)_46%,rgba(15,23,42,0.34)_100%)]" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex border border-white/20 px-3 py-1.5 text-xs font-bold tracking-[0.28em] text-blue-200">
              INDUSTRIAL MANUFACTURING
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight">
              {data.name}
            </h1>
            <p className="mt-6 text-xl md:text-2xl font-semibold text-white/90">
              {data.slogan || "面向工业客户的精密制造与稳定交付合作伙伴。"}
            </p>
            <p className="mt-5 max-w-2xl text-sm md:text-base leading-8 text-white/68">
              {data.intro}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <a
                href="#products"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 px-7 py-3 font-bold text-white no-underline transition-colors hover:bg-blue-500"
              >
                查看产品 <IconArrowRight />
              </a>
              <a
                href={`/portal/${domain}/${lang}/contact`}
                className="inline-flex items-center justify-center border border-white/30 px-7 py-3 font-bold text-white no-underline transition-colors hover:bg-white hover:text-slate-950"
              >
                提交询价
              </a>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 border border-white/15 bg-white/6 backdrop-blur">
            {capabilityItems.map((item) => (
              <div
                key={item.label}
                className="border-r border-b border-white/10 p-5 last:border-r-0 lg:border-b-0"
              >
                <div className="text-xs font-bold text-white/50">
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-black break-words">
                  {item.value}
                  <span className="ml-1 text-sm text-blue-200">
                    {item.suffix}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="max-w-7xl mx-auto px-6 py-14 md:py-18">
        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <div className="lg:sticky lg:top-24 self-start border border-slate-200 bg-white p-6">
            <p className="text-xs font-black tracking-[0.22em] text-blue-700">
              PRODUCT CENTER
            </p>
            <h2 className="mt-3 text-3xl font-black">产品中心</h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {homeConfig.productDescription ||
                "按产品系列展示材料、规格与应用信息，帮助客户快速定位可生产范围。"}
            </p>
            <a
              href={`/portal/${domain}/${lang}/products`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700 no-underline"
            >
              进入完整目录 <IconArrowRight />
            </a>
          </div>
          <ProductGrid categories={categories} domain={domain} lang={lang} />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-14">
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="border border-slate-200 bg-white p-6 md:p-8">
            <p className="text-xs font-black tracking-[0.22em] text-blue-700">
              FACTORY RESPONSE
            </p>
            <h2 className="mt-3 text-3xl font-black">
              {homeConfig.responseTitle || "工程咨询与样品沟通"}
            </h2>
            <p className="mt-4 text-slate-500 leading-8">
              {homeConfig.responseDescription ||
                "如需非标规格、材料确认或批量报价，可以直接提交图纸和需求，我们会根据产品参数提供沟通建议。"}
            </p>
            <div className="mt-7 grid sm:grid-cols-3 gap-3 text-sm">
              {responseItems.map((item) => (
                <div key={item.title} className="border border-slate-200 p-4">
                  <div className="font-black text-slate-900">{item.title}</div>
                  <div className="mt-2 text-slate-500">{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="border border-blue-100 bg-white p-6">
            <h3 className="text-xl font-black text-slate-950">联系工厂</h3>
            <div className="mt-6 space-y-5 text-sm">
              <div className="flex gap-3">
                <IconUser className="mt-1 text-blue-700" />
                <div>
                  <div className="text-slate-400">联系人</div>
                  <div className="mt-1 font-bold text-slate-950">
                    {data.contactPerson}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <IconPhone className="mt-1 text-blue-700" />
                <div>
                  <div className="text-slate-400">咨询热线</div>
                  <div className="mt-1 font-mono text-lg font-black text-slate-950">
                    {data.phone}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <IconMapPin className="mt-1 text-blue-700" />
                <div>
                  <div className="text-slate-400">工厂地址</div>
                  <div className="mt-1 leading-7 text-slate-600">
                    {data.address}
                  </div>
                </div>
              </div>
            </div>
            <a
              href={`/portal/${domain}/${lang}/contact`}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 bg-blue-700 px-5 py-3 font-bold text-white no-underline transition-colors hover:bg-blue-800"
            >
              <IconMail /> 在线询价
            </a>
          </aside>
        </div>
      </section>

      {data.jobs?.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="grid lg:grid-cols-[300px_1fr] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-100 p-6 lg:border-b-0 lg:border-r">
              <p className="text-xs font-black tracking-[0.22em] text-blue-700">
                CAREERS
              </p>
              <h2 className="mt-3 text-3xl font-black">招聘职位</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                {homeConfig.jobsDescription ||
                  "加入制造现场与客户交付团队，一起把产品做稳、做准。"}
              </p>
              <a
                href={`/portal/${domain}/${lang}/jobs`}
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700 no-underline"
              >
                查看全部 <IconArrowRight />
              </a>
            </div>
            <div className="p-6">
              <JobBoard jobs={data.jobs.slice(0, 3)} />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
