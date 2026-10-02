"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconSetting,
  IconComponent,
  IconApartment,
  IconApps,
} from "@douyinfe/semi-icons";
import { Button } from "../Button";
import { useFoundation } from "../Providers";
import { catalogCopy } from "@/src/lib/catalog/copy";
import type { CatalogHomeData } from "@/src/lib/catalog/model";
import { safeCatalogImage } from "@/src/lib/catalog/model";
import { useCatalog } from "@/src/lib/catalog/use-catalog";
import { CatalogShell, PageContainer } from "./CatalogShell";
import { SearchBar } from "./SearchBar";
import { ProductCard } from "./Cards";
import { UsefulTools } from "./DesignPrimitives";
import { CatalogState } from "./CatalogState";
export function CatalogHome() {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  const [kind, setKind] = useState<"products" | "suppliers">("products");
  const products = useCatalog<CatalogHomeData>("home");
  const sectors = [
    {
      query: "汽车",
      name: locale === "en" ? "Automotive" : "汽车工业",
      hint: locale === "en" ? "Parts · Components" : "零件 · 组件",
      icon: IconApps,
    },
    {
      query: "机械",
      name: locale === "en" ? "Machinery & Equipment" : "机械与设备",
      hint: locale === "en" ? "Transmission · Parts" : "传动 · 零件",
      icon: IconSetting,
    },
    {
      query: "自动化",
      name: locale === "en" ? "Industrial Automation" : "工业自动化",
      hint:
        locale === "en"
          ? "Pneumatics · Hydraulic · Machining"
          : "气动 · 液压 · 加工",
      icon: IconComponent,
    },
    {
      query: "建筑",
      name:
        locale === "en" ? "Construction & Infrastructure" : "建筑与基础设施",
      hint:
        locale === "en"
          ? "Pipe Fittings · Fasteners · Components"
          : "管件 · 紧固件 · 组件",
      icon: IconApartment,
    },
  ];
  return (
    <CatalogShell>
      <PageContainer>
        <section className="relative overflow-hidden rounded-[10px] bg-jade-50">
          <div className="relative z-10 px-6 pt-8 pb-4 sm:p-10 lg:w-[57%] lg:py-12">
            <h1 className="max-w-xl text-3xl leading-tight font-bold sm:text-4xl lg:text-[42px]">
              {products.data?.hero.title || t.heroTitle}
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-600">
              {products.data?.hero.description || t.heroDescription}
            </p>
            <div className="mt-7 flex gap-2" role="group" aria-label={t.search}>
              {(["products", "suppliers"] as const).map((k) => (
                <Button
                  radius={6}
                  key={k}
                  variant={kind === k ? "primary" : "outline"}
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                >
                  {t[k]}
                </Button>
              ))}
            </div>
            <div className="mt-3">
              <SearchBar key={kind} kind={kind} />
            </div>
          </div>
          <div className="relative aspect-[3/2] w-full lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[52%]">
            <Image
              src={safeCatalogImage(products.data?.imageUrl)||"/catalog/industrial-hero.webp"}
              fill
              alt={t.heroImage}
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover lg:object-right"
            />
            <div className="absolute inset-0 hidden bg-linear-to-r from-jade-50 via-transparent to-transparent lg:block" />
          </div>
        </section>
        <section className="mt-7">
          <h2 className="mb-4 text-xl font-semibold">{t.industries}</h2>
          {products.data && !products.data.industries.length && <p className="mb-3 text-sm text-ink-500">{t.notProvided}</p>}
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {(products.data?.industries.length?products.data.industries.map((i,index)=>({query:i.code,name:i.name,hint:"",icon:sectors[index]?.icon||IconApps})):[]).map(({ query, name, hint, icon: Icon }) => (
              <Link
                key={query}
                href={`/products?industry=${encodeURIComponent(query)}`}
                className="flex min-h-20 min-w-0 items-center gap-3 rounded-[6px] border border-ink-100 bg-white p-3 hover:border-jade-400"
              >
                <span className="shrink-0 rounded-[6px] bg-jade-50 p-2 text-jade-700">
                  <Icon size="extra-large" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{name}</span>
                  <span className="mt-1 block text-xs text-ink-500">
                    {hint}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
          <section className="min-w-0">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{t.featured}</h2>
              <Link
                href="/products"
                className="text-sm font-semibold text-jade-700"
              >
                {t.viewAll} →
              </Link>
            </div>
            <CatalogState
              loading={products.loading}
              error={products.error}
              empty={products.data?.products.length === 0}
              retry={products.retry}
            />
            {products.data && (
              <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
                {products.data.products.map((p) => (
                  <ProductCard key={p.id} product={p} compact featured />
                ))}
              </div>
            )}
          </section>
          <UsefulTools />
        </div>
      </PageContainer>
    </CatalogShell>
  );
}
