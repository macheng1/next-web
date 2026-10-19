"use client";
import Link from "next/link";
import { EnterpriseFacts } from "./EnterpriseFacts";
import type { Product, EnterpriseSummary } from "@/src/lib/catalog/model";
import { catalogCopy } from "@/src/lib/catalog/copy";
import { useFoundation } from "../Providers";
import { CatalogImage } from "./CatalogImage";
import { linkButton } from "./CatalogShell";
export function ProductCard({
  product,
  compact = false,
  horizontal = false,
}: {
  product: Product;
  compact?: boolean;
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
          <Link
            href={`/products/${product.id}`}
            className={`${linkButton} mt-auto ${horizontal ? "min-h-9 px-2 text-xs" : ""}`}
          >
            {t.viewDetails} →
          </Link>
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
    <article className="w-full min-w-0 rounded-[8px] border border-ink-100 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[6px] bg-ink-50">
            <CatalogImage
              src={enterprise.logoUrl}
              alt={enterprise.name}
              company
            />
          </div>
          <h2 className="min-w-0 break-words text-lg font-semibold text-ink-900">
            <Link
              href={`/suppliers/${enterprise.id}`}
              className="hover:text-jade-700"
            >
              {enterprise.name}
            </Link>
          </h2>
        </div>
        <Link
          href={`/suppliers/${enterprise.id}`}
          className={`${linkButton} hidden shrink-0 sm:inline-flex`}
        >
          {t.supplierProfile} →
        </Link>
      </div>
      <EnterpriseFacts enterprise={enterprise} />
      <p className="mt-4 line-clamp-3 break-words text-sm leading-6 text-ink-600">
        {enterprise.description || t.notProvided}
      </p>
      {enterprise.industryName && (
        <span className="mt-4 inline-flex max-w-full rounded-full border border-jade-100 bg-jade-50 px-3 py-1 text-sm text-jade-700">
          {enterprise.industryName}
        </span>
      )}
      <Link
        href={`/suppliers/${enterprise.id}`}
        className={`${linkButton} mt-5 flex sm:hidden`}
      >
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
