"use client";
import { Select, Checkbox } from "@douyinfe/semi-ui-19";
import { useState, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconFilter } from "@douyinfe/semi-icons";
import { catalogCopy } from "@/src/lib/catalog/copy";
import {
  catalogQuery,
  type CatalogPage,
  type CatalogOptions,
  type Product,
  type EnterpriseSummary,
} from "@/src/lib/catalog/model";
import { useCatalog } from "@/src/lib/catalog/use-catalog";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { Sheet } from "../Sheet";
import { CatalogShell, PageContainer } from "./CatalogShell";
import { ProductGrid, EnterpriseCard } from "./Cards";
import { SearchBar } from "./SearchBar";
import { CatalogState } from "./CatalogState";
function FilterPanel({
  options,
  values,
  change,
  clear,
  isProduct,
}: {
  options: CatalogOptions;
  values: URLSearchParams;
  change: (key: string, value: string) => void;
  clear: () => void;
  isProduct: boolean;
}) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  const labelId = useId();
  return (
    <div className="space-y-5">
      {isProduct && (
        <div>
          <h2 className="mb-3 font-semibold">{t.categories}</h2>
          <div className="flex flex-col gap-1">
            {["", ...options.categories].map((c) => (
              <Button
                radius={6}
                key={c}
                block
                variant={
                  (values.get("category") || "") === c ? "secondary" : "ghost"
                }
                onClick={() => change("category", c)}
                className="min-h-11 min-w-0! justify-start! px-3! whitespace-nowrap! text-left! [&_.semi-button-content]:min-w-0 [&_.semi-button-content]:w-full"
                aria-pressed={(values.get("category") || "") === c}
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate" title={options.categoryOptions?.find(o=>o.value===c)?.label || c || t.all}>
                    {options.categoryOptions?.find(o=>o.value===c)?.label || c || t.all}
                  </span>
                  {c && options.categoryCounts?.[c] !== undefined && (
                    <span className="shrink-0 text-xs font-normal text-ink-500">
                      {options.categoryCounts[c]}
                    </span>
                  )}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
      {isProduct &&
        (["material", "connection", "size"] as const).map((key) => (
          <details
            key={key}
            open={key !== "size"}
            className="border-t border-ink-100 pt-4"
          >
            <summary className="cursor-pointer text-sm font-semibold">
              {key === "size" ? t.sizeRange : t[key]}
            </summary>
            <div className="mt-3 space-y-3">
              {options.facets?.[key]?.length ? (
                options.facets[key].map((f) => (
                  <div
                    key={f.value}
                    className="flex min-w-0 items-center justify-between gap-2 text-xs"
                  >
                    <Checkbox
                      className="min-w-0 flex-1 [&_.semi-checkbox-addon]:min-w-0 [&_.semi-checkbox-addon]:truncate"
                      checked={(values.get(key) || "")
                        .split("|")
                        .includes(f.value)}
                      onChange={() => {
                        const selected = (values.get(key) || "")
                          .split("|")
                          .filter(Boolean);
                        change(
                          key,
                          (selected.includes(f.value)
                            ? selected.filter((v) => v !== f.value)
                            : [...selected, f.value]
                          ).join("|"),
                        );
                      }}
                    >
                      <span className="block truncate" title={f.label||f.value}>
                        {f.label||f.value}
                      </span>
                    </Checkbox>
                    <span className="shrink-0 text-ink-500">{f.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ink-500">{t.noFilterValues}</p>
              )}
            </div>
          </details>
        ))}
      {!isProduct && (
        <div>
          <label id={labelId} className="mb-3 block font-semibold">
            {t.industry}
          </label>
          <Select
            aria-labelledby={labelId}
            className="w-full"
            value={values.get("industry") || ""}
            optionList={[
              { value: "", label: t.all },
              ...options.industries.map((i) => ({
                value: i.code,
                label: i.name,
              })),
            ]}
            onChange={(v) => change("industry", String(v))}
          />
        </div>
      )}
      <Button radius={6} variant="outline" block onClick={clear}>
        {t.clear}
      </Button>
    </div>
  );
}
export function CatalogDirectory({
  kind = "products",
}: {
  kind?: "products" | "suppliers";
}) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  const router = useRouter();
  const search = useSearchParams();
  const [filters, setFilters] = useState(false);
  const params = new URLSearchParams(search.toString());
  const query = catalogQuery(params);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const options = useCatalog<CatalogOptions>(`options?${query}`);
  const results = useCatalog<CatalogPage<Product | EnterpriseSummary>>(
    `${kind === "suppliers" ? "enterprises" : "products"}?${query}`,
  );
  function change(key: string, value: string) {
    const next = new URLSearchParams(query);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.push(`/${kind}?${next.toString()}`, { scroll: false });
    setFilters(false);
  }
  const filterContent = options.data ? (
    <FilterPanel
      options={options.data}
      values={params}
      change={change}
      clear={() => router.push(`/${kind}`, { scroll: false })}
      isProduct={kind === "products"}
    />
  ) : (
    <CatalogState
      loading={options.loading}
      error={options.error}
      retry={options.retry}
    />
  );
  return (
    <CatalogShell>
      <PageContainer>
        <h1 className="sr-only">{t[kind]}</h1>
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden self-start rounded-[8px] border border-ink-100 bg-white p-4 lg:block">
            {filterContent}
          </aside>
          <section className="min-w-0">
            <SearchBar
              key={`${kind}-${params.get("q") || ""}`}
              kind={kind}
              initial={params.get("q") || ""}
              onSearch={(q) => change("q", q)}
            />
            <div className="my-5 flex flex-wrap items-center justify-between gap-3">
              <Button
                radius={6}
                variant="outline"
                icon={<IconFilter aria-hidden />}
                aria-label={t.filters}
                className="lg:hidden!"
                onClick={() => setFilters(true)}
              >
                {t.filters}
              </Button>
              <p role="status" className="text-sm text-ink-600">
                {results.data
                  ? `${results.data.total} ${t.results}`
                  : t.loading}
              </p>
              <Select
                aria-label={t.sort}
                value={params.get("sort") || "new"}
                optionList={[
                  { value: "new", label: t.newest },
                  { value: "name", label: t.name },
                ]}
                onChange={(v) => change("sort", String(v))}
                className="w-44"
              />
            </div>
            {(params.get("q") ||
              params.get("category") ||
              params.get("industry") ||
              params.get("material") ||
              params.get("connection") ||
              params.get("size")) && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {["q", "category", "industry", "material", "connection", "size"]
                  .filter((k) => params.get(k))
                  .flatMap((k) => {
                    const multiple = [
                      "material",
                      "connection",
                      "size",
                    ].includes(k);
                    const values = multiple
                      ? params.get(k)!.split("|").filter(Boolean)
                      : [params.get(k)!];
                    return values.map((value) => {
                      const label =
                        k === "industry"
                          ? options.data?.industries.find(
                              (i) => i.code === value,
                            )?.name || value
                          : k==="category" ? options.data?.categoryOptions?.find(o=>o.value===value)?.label||value
                          : ["material","connection","size"].includes(k) ? options.data?.facets?.[k as "material"|"connection"|"size"].find(f=>f.value===value)?.label||value : value;
                      return (
                        <Button
                          radius={6}
                          key={`${k}:${value}`}
                          variant="secondary"
                          title={label}
                          className="max-w-full min-w-0! whitespace-nowrap! [&_.semi-button-content]:min-w-0"
                          onClick={() =>
                            change(
                              k,
                              multiple
                                ? values.filter((v) => v !== value).join("|")
                                : "",
                            )
                          }
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="min-w-0 truncate">{label}</span>
                            <span className="shrink-0" aria-hidden>
                              ×
                            </span>
                          </span>
                        </Button>
                      );
                    });
                  })}
                <Button
                  radius={6}
                  variant="ghost"
                  onClick={() => router.push(`/${kind}`)}
                >
                  {t.clearAll}
                </Button>
              </div>
            )}
            <CatalogState
              loading={results.loading}
              error={results.error}
              retry={results.retry}
              empty={results.data?.items.length === 0}
            />
            {results.data &&
              (kind === "products" ? (
                <ProductGrid products={results.data.items as Product[]} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {(results.data.items as EnterpriseSummary[]).map((e) => (
                    <EnterpriseCard key={e.id} enterprise={e} />
                  ))}
                </div>
              ))}
            {results.data && results.data.total > results.data.pageSize && (
              <nav
                aria-label={t.page}
                className="mt-7 flex flex-wrap items-center justify-center gap-4"
              >
                <Button
                  radius={6}
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => change("page", String(page - 1))}
                >
                  {t.previous}
                </Button>
                <span>
                  {page} /{" "}
                  {Math.ceil(results.data.total / results.data.pageSize)}
                </span>
                <Button
                  radius={6}
                  variant="outline"
                  disabled={page * results.data.pageSize >= results.data.total}
                  onClick={() => change("page", String(page + 1))}
                >
                  {t.next}
                </Button>
              </nav>
            )}
          </section>
        </div>
        <Sheet
          open={filters}
          onClose={() => setFilters(false)}
          title={t.filters}
        >
          {filterContent}
        </Sheet>
      </PageContainer>
    </CatalogShell>
  );
}
