"use client";
import Link from "next/link";
import { IconMapPin } from "@douyinfe/semi-icons";
import type { Enterprise, EnterpriseSummary } from "@/src/lib/catalog/model";
import { useCatalog } from "@/src/lib/catalog/use-catalog";
import { catalogCopy } from "@/src/lib/catalog/copy";
import { useFoundation } from "../Providers";
import { CatalogImage } from "./CatalogImage";
import { Chips } from "./DesignPrimitives";
import { linkButton } from "./CatalogShell";
export function SupplierSummary({
  enterprise,
}: {
  enterprise: EnterpriseSummary;
}) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  const result = useCatalog<Enterprise>(`enterprises/${enterprise.id}`);
  const full = result.data;
  const categories = [...new Set(full?.products.map((p) => p.category) || [])];
  return (
    <article className="overflow-hidden rounded-[6px] border border-ink-100 bg-white">
      <div className="relative aspect-[16/9] bg-ink-50">
        <CatalogImage
          src={full?.coverUrl || enterprise.logoUrl}
          alt={enterprise.name}
          company
          cover={!!full?.coverUrl}
        />
      </div>
      <div className="space-y-4 p-4">
        <div>
          <h2 className="break-words font-semibold">{enterprise.name}</h2>
          {enterprise.city && (
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
              <IconMapPin />
              {enterprise.city}
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t.mainProducts}</h3>
          <Chips
            values={categories}
            empty={result.loading ? t.loading : t.notProvided}
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t.capabilities}</h3>
          <Chips values={full?.capabilities?.map(c=>c.name)||[]} empty={t.noCapabilities} />
        </div>
        <Link
          href={`/suppliers/${enterprise.id}`}
          className={`${linkButton} w-full`}
        >
          {t.supplierProfile} →
        </Link>
      </div>
    </article>
  );
}
