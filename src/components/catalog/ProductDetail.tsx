"use client";
import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/src/lib/catalog/model";
import { useCatalog } from "@/src/lib/catalog/use-catalog";
import { catalogCopy } from "@/src/lib/catalog/copy";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { CatalogShell, PageContainer } from "./CatalogShell";
import { CatalogState } from "./CatalogState";
import { CatalogImage } from "./CatalogImage";
import { VariantPicker } from "./VariantPicker";
import { SupplierSummary } from "./SupplierSummary";
import { ComingSoon, Chips } from "./DesignPrimitives";
import { InputNumber } from "@douyinfe/semi-ui-19";
import {
  IconComment,
  IconHeartStroked,
  IconShareStroked,
  IconPlus,
  IconMinus,
} from "@douyinfe/semi-icons";
function DetailContent({ product: p }: { product: Product }) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  const [variant, setVariant] = useState(0);
  const [image, setImage] = useState(0);
  const [quantity, setQuantity] = useState(100);
  const selected = p.variants[variant];
  const images = [
    ...new Set(
      [selected?.imageUrl, ...p.images].filter((v): v is string => !!v),
    ),
  ];
  const facts = [
    ...p.attributes,
    ...(p.brand ? [{ name: t.brand, value: p.brand }] : []),
    ...(p.unit ? [{ name: t.unit, value: p.unit }] : []),
  ];
  return (
    <>
      <nav className="mb-6 flex flex-wrap gap-2 text-sm text-ink-600">
        <Link href="/">{t.home}</Link> /{" "}
        <Link href="/products">{t.products}</Link> /{" "}
        <span className="break-words">{p.name}</span>
      </nav>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
        <section className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[60px_minmax(0,1fr)]">
          <div className="relative col-start-2 aspect-square rounded-[8px] border border-ink-100 bg-white">
            <CatalogImage
              src={images[image] || images[0]}
              alt={p.name}
              priority
            />
          </div>
          {images.length > 1 && (
            <div className="col-start-1 row-start-1 grid gap-2">
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  aria-label={`${t.chooseImage} ${i + 1}`}
                  aria-pressed={image === i}
                  onClick={() => setImage(i)}
                  className={`relative aspect-square rounded-[6px] border bg-white ${i === image ? "border-jade-700" : "border-ink-100"}`}
                >
                  <CatalogImage src={url} alt="" compact />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="break-words text-2xl leading-tight font-bold sm:text-3xl">
              {p.name}
            </h1>
          </div>
          <div className="my-3 flex flex-wrap gap-2">
            <Chips
              values={[p.material, p.connection].filter(
                (v): v is string => !!v,
              )}
            />
            <ComingSoon compact>
              <IconHeartStroked aria-hidden />
              {t.favorite}
            </ComingSoon>
            <ComingSoon compact>
              <IconShareStroked aria-hidden />
              {t.share}
            </ComingSoon>
          </div>
          <p className="mt-4 whitespace-pre-wrap break-words text-ink-600">
            {p.description || t.notProvided}
          </p>
          <h2 className="mt-6 mb-3 font-semibold">{t.specifications}</h2>
          <dl className="overflow-hidden rounded-[6px] border border-ink-100">
            {facts.length ? (
              facts.map((f, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 border-b border-ink-100 px-4 py-3 text-sm last:border-0"
                >
                  <dt className="break-words text-ink-600">{f.name}</dt>
                  <dd className="break-words">{f.value}</dd>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-ink-600">{t.notProvided}</div>
            )}
          </dl>
        </section>
        <section className="min-w-0 space-y-4 rounded-[6px] border border-ink-100 bg-white p-4 lg:col-span-2 lg:row-start-2">
          {p.dimensionNames?.length ? <VariantPicker product={p} selected={variant} onChange={i=>{setVariant(i);setImage(0);}}/> : (
          <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center">
            <h2 className="text-sm font-semibold">
              {p.variantName === "规格" ? t.variant : p.variantName}
            </h2>
            <div
              role="group"
              aria-label={t.variant}
              className="flex flex-wrap gap-2"
            >
              {p.variants.map((v, i) => (
                <Button
                  radius={6}
                  key={v.id}
                  variant={variant === i ? "secondary" : "outline"}
                  aria-pressed={variant === i}
                  onClick={() => {
                    setVariant(i);
                    setImage(0);
                  }}
                  className="h-auto! min-h-11 whitespace-normal!"
                >
                  <span className="flex items-center gap-2">
                    <span className="relative h-8 w-8 shrink-0">
                      <CatalogImage
                        src={v.imageUrl || p.images[0]}
                        alt=""
                        compact
                      />
                    </span>
                    {v.value === "默认" ? t.variant : v.value}
                  </span>
                </Button>
              ))}
            </div>
          </div>
          )}
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-500">
            <div>
              <dt className="inline">{t.price}: </dt>
              <dd className="inline">{selected?.price || t.notProvided}</dd>
            </div>
            <div>
              <dt className="inline">{t.moq}: </dt>
              <dd className="inline">{selected?.minOrder || t.notProvided}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-100 pt-4">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
              <span id="product-quantity">{t.quantity}</span>
              <span className="inline-flex items-center rounded-[6px] border border-ink-100">
                <Button
                  radius={0}
                  size={40}
                  variant="ghost"
                  aria-label={
                    locale === "en" ? "Decrease quantity" : "减少数量"
                  }
                  disabled={quantity <= 1}
                  icon={<IconMinus />}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                />
                <InputNumber
                  hideButtons
                  className="w-24!"
                  aria-labelledby="product-quantity"
                  min={1}
                  max={1000000}
                  precision={0}
                  value={quantity}
                  onChange={(v) => setQuantity(typeof v === "number" ? v : 1)}
                />
                <Button
                  radius={0}
                  size={40}
                  variant="ghost"
                  aria-label={
                    locale === "en" ? "Increase quantity" : "增加数量"
                  }
                  disabled={quantity >= 1000000}
                  icon={<IconPlus />}
                  onClick={() => setQuantity(Math.min(1000000, quantity + 1))}
                />
              </span>{" "}
              <span className="font-normal text-ink-500">{p.unit || ""}</span>
            </div>
            <ComingSoon prominent>
              <IconComment />
              {t.sendInquiry}
            </ComingSoon>
          </div>
        </section>
        <aside className="lg:col-start-3 lg:row-start-1">
          <SupplierSummary enterprise={p.enterprise} />
        </aside>
      </div>
      <p className="mt-8 border-t border-ink-100 pt-5 text-xs text-ink-600">
        {t.profileNote}
      </p>
    </>
  );
}
export function CatalogProductDetail({ id }: { id: string }) {
  const result = useCatalog<Product>(`products/${id}`);
  return (
    <CatalogShell>
      <PageContainer>
        <CatalogState
          loading={result.loading}
          error={result.error}
          retry={result.retry}
        />
        {result.data && (
          <DetailContent key={result.data.id} product={result.data} />
        )}
      </PageContainer>
    </CatalogShell>
  );
}
