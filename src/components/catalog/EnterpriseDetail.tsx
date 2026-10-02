"use client";
import { useState } from "react";
import Link from "next/link";
import type { Enterprise, Product, CatalogPage } from "@/src/lib/catalog/model";
import { useCatalog } from "@/src/lib/catalog/use-catalog";
import { catalogCopy } from "@/src/lib/catalog/copy";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { CatalogShell, PageContainer } from "./CatalogShell";
import { CatalogState } from "./CatalogState";
import { CatalogImage } from "./CatalogImage";
import { ProductGrid, ProductCard } from "./Cards";
import { ComingSoon, Chips, ContactCard } from "./DesignPrimitives";
import { IconMapPin, IconComment } from "@douyinfe/semi-icons";
function EnterpriseContent({ enterprise: e }: { enterprise: Enterprise }) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  const [page,setPage]=useState(1);
  const list=useCatalog<CatalogPage<Product>>(`enterprises/${e.id}/products?page=${page}&pageSize=12`);
  const [tab, setTab] = useState<"overview" | "products" | "companyProfile">(
    "overview",
  );
  return (
    <>
      <nav className="mb-5 flex flex-wrap gap-2 text-sm text-ink-600">
        <Link href="/">{t.home}</Link> /{" "}
        <Link href="/suppliers">{t.suppliers}</Link>
      </nav>
      <section className="relative overflow-hidden rounded-t-xl border border-jade-100 bg-jade-50">
        <div className="absolute inset-y-0 right-0 w-full sm:w-3/5">
          <CatalogImage
            src={e.coverUrl}
            alt={e.name}
            company
            cover
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-r from-jade-50 via-jade-50/95 to-white/40 sm:via-jade-50/85 sm:to-transparent" />
        <div className="relative flex min-h-60 flex-col justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-end">
          <div className="min-w-0 lg:max-w-[65%]">
            <h1 className="break-words text-3xl font-bold sm:text-4xl">
              {e.name}
            </h1>
            {e.city && (
              <p className="mt-3 flex items-center gap-2 text-sm">
                <IconMapPin />
                {e.city}
              </p>
            )}
            <p className="mt-4 whitespace-pre-wrap break-words text-sm text-ink-600">
              {e.description || t.notProvided}
            </p>
          </div>
          <div className="shrink-0">
            <ComingSoon prominent>
              <IconComment />
              {t.sendInquiry}
            </ComingSoon>
          </div>
        </div>
      </section>
      <div
        role="group"
        aria-label={t.companyProfile}
        className="mb-6 flex flex-wrap gap-4 border-x border-b border-ink-100 bg-white px-4 py-2"
      >
        {(["overview", "products", "companyProfile"] as const).map((v) => (
          <Button
            radius={6}
            key={v}
            variant="ghost"
            className={
              tab === v ? "rounded-none! border-b-2! border-jade-700!" : ""
            }
            aria-pressed={tab === v}
            onClick={() => setTab(v)}
          >
            {t[v]}
          </Button>
        ))}
      </div>
      {tab === "overview" && (
        <section className="mb-7 grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
          <div className="rounded-[6px] border border-ink-100 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">{t.mainProducts}</h2>
            <Chips
              values={[...new Set(e.products.map((p) => p.category))]}
              empty={t.notProvided}
            />
          </div>
          <div className="rounded-[6px] border border-ink-100 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">{t.capabilities}</h2>
            <Chips values={e.capabilities?.map(c=>c.name)||[]} empty={t.noCapabilities} />
          </div>
          <ContactCard />
        </section>
      )}
      {tab === "companyProfile" && (
        <section className="mb-7 rounded-[8px] border border-ink-100 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold">{t.companyProfile}</h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              { label: t.companyName, value: e.name },
              { label: t.location, value: e.city },
              { label: t.address, value: e.address },
              { label: t.founded, value: e.foundedYear },
            ].map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-sm text-ink-500">{f.label}</dt>
                <dd className="mt-1 break-words">{f.value || t.notProvided}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {tab !== "companyProfile" && (
        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{t.companyProducts}</h2>
            {tab === "overview" && (
              <Button
                radius={6}
                variant="ghost"
                onClick={() => setTab("products")}
              >
                {t.viewAll} →
              </Button>
            )}
          </div>
          <CatalogState empty={e.products.length === 0} />
          {tab === "overview" ? (
            <div className="grid gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
              {e.products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} compact horizontal />
              ))}
            </div>
          ) : (
            <>
              <CatalogState loading={list.loading} error={list.error} empty={list.data?.items.length===0} retry={list.retry}/>
              {list.data&&<ProductGrid products={list.data.items}/>}
              {list.data&&list.data.total>12&&<div className="mt-5 flex items-center justify-center gap-4"><Button radius={6} disabled={page===1} onClick={()=>setPage(p=>p-1)}>{locale==="en"?"Previous":"上一页"}</Button><span>{page} / {Math.ceil(list.data.total/12)}</span><Button radius={6} disabled={page*12>=list.data.total} onClick={()=>setPage(p=>p+1)}>{locale==="en"?"Next":"下一页"}</Button></div>}
            </>
          )}
        </section>
      )}
      {tab === "companyProfile" && e.albums.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-5 text-xl font-semibold">{t.albums}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {e.albums.map((a) => (
              <figure
                key={a.id}
                className="overflow-hidden rounded-[8px] border border-ink-100 bg-white"
              >
                <div className="relative aspect-[4/3]">
                  <CatalogImage src={a.imageUrl} alt={a.title || e.name} />
                </div>
                {a.title && (
                  <figcaption className="break-words p-3 text-sm">
                    {a.title}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}
      <p className="mt-8 border-t border-ink-100 pt-5 text-xs text-ink-600">
        {t.profileNote}
      </p>
    </>
  );
}
export function CatalogEnterpriseDetail({ id }: { id: string }) {
  const result = useCatalog<Enterprise>(`enterprises/${id}`);
  return (
    <CatalogShell>
      <PageContainer>
        <CatalogState
          loading={result.loading}
          error={result.error}
          retry={result.retry}
        />
        {result.data && <EnterpriseContent key={id} enterprise={result.data} />}
      </PageContainer>
    </CatalogShell>
  );
}
