"use client";
import { Spin } from "@douyinfe/semi-ui-19";
import { IconSpin } from "@douyinfe/semi-icons";
import { catalogCopy } from "@/src/lib/catalog/copy";
import { HttpError } from "@/src/lib/http/types";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
export function CatalogState({
  loading,
  error,
  empty,
  retry,
}: {
  loading?: boolean;
  error?: HttpError;
  empty?: boolean;
  retry?: () => void;
}) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  if (loading)
    return (
      <div role="status" className="flex justify-center gap-3 py-16">
        {/* Semi 默认 spin 图标的 linearGradient id 由模块自增计数器生成，SSR 与水合不一致；IconSpin 使用静态 id */}
        <Spin indicator={<IconSpin spin />} />
        {t.loading}
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-[8px] border border-ink-100 bg-white p-8 text-center"
      >
        <h2 className="font-semibold">
          {error.status === 404 ? t.notFound : t.error}
        </h2>
        {error.status === 404 ? (
          <p>{t.notFoundHint}</p>
        ) : (
          <Button radius={6} className="mt-4" variant="outline" onClick={retry}>
            {t.retry}
          </Button>
        )}
        {error.traceId && (
          <p className="mt-3 break-all text-xs text-ink-500">
            ID: {error.traceId}
          </p>
        )}
      </div>
    );
  if (empty)
    return (
      <div
        role="status"
        className="rounded-[8px] border border-ink-100 bg-white p-10 text-center"
      >
        <h2 className="font-semibold">{t.noResults}</h2>
        <p className="mt-2 text-sm text-ink-600">{t.noResultsHint}</p>
      </div>
    );
  return null;
}
