"use client";
import Link from "next/link";
import { IconMapPin } from "@douyinfe/semi-icons";
import type { Product, EnterpriseSummary } from "@/src/lib/catalog/model";
import { catalogCopy } from "@/src/lib/catalog/copy";
import { useFoundation } from "../Providers";
import { CatalogImage } from "./CatalogImage";
import { ComingSoon } from "./DesignPrimitives";
import { linkButton } from "./CatalogShell";
export function ProductCard({
  product,
  compact = false,
  featured = false,
  horizontal = false,
}: {
  product: Product;
  compact?: boolean;
  featured?: boolean;
  horizontal?: boolean;
}) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  return (
    <article
      className={`flex min-w-0 overflow-hidden rounded-[8px] border border-ink-100 bg-white ${horizontal ? "flex-row" : "flex-col"}`}
    >
      <Link
        href={`/products/${product.id}`}
        aria-label={`${t.viewDetails}: ${product.name}`}
        className={`relative block bg-ink-50 ${horizontal ? "min-h-28 w-24 shrink-0" : "aspect-square"}`}
      >
        <CatalogImage
          src={product.images[0]}
          alt={product.name}
          compact={horizontal}
        />
      </Link>
      <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-3" : "p-4"}`}>
        <Link
          href={`/products/${product.id}`}
          className={`break-words font-semibold text-ink-900 hover:text-jade-700 ${compact ? "text-sm" : ""}`}
        >
          {product.name}
        </Link>
        <p className="line-clamp-2 text-xs text-ink-500">
          {[product.material, product.connection].filter(Boolean).join(" · ") ||
            product.category}
        </p>
        {featured ? (
          <ComingSoon compact>{t.requestPricing}</ComingSoon>
        ) : (
          <Link
            href={`/products/${product.id}`}
            className={`${linkButton} mt-auto ${horizontal ? "min-h-9 px-2 text-xs" : ""}`}
          >
            {t.viewDetails} →
          </Link>
        )}
      </div>
    </article>
  );
}
export function EnterpriseCard({
  enterprise,
}: {
  enterprise: EnterpriseSummary;
}) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  return (
    <article className="min-w-0 rounded-[8px] border border-ink-100 bg-white p-5">
      <div className="mb-4 flex gap-4">
        <div className="relative h-16 w-16 shrink-0 rounded-[6px] bg-ink-50">
          <CatalogImage
            src={enterprise.logoUrl}
            alt={enterprise.name}
            company
          />
        </div>
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold">
            {enterprise.name}
          </h2>
          {enterprise.city && (
            <p className="text-sm text-ink-600">
              <IconMapPin /> {enterprise.city}
            </p>
          )}
        </div>
      </div>
      <p className="mb-5 line-clamp-3 break-words text-sm text-ink-600">
        {enterprise.description || t.notProvided}
      </p>
      <Link href={`/suppliers/${enterprise.id}`} className={linkButton}>
        {t.supplierProfile} →
      </Link>
    </article>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={`${p.enterprise.id}-${p.id}`} product={p} />
      ))}
    </div>
  );
}
