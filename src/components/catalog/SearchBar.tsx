"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@douyinfe/semi-icons";
import { Field } from "../Field";
import { Button } from "../Button";
import { useFoundation } from "../Providers";
import { catalogCopy } from "@/src/lib/catalog/copy";
export function SearchBar({
  initial = "",
  kind = "products",
  onSearch,
}: {
  initial?: string;
  kind?: "products" | "suppliers";
  onSearch?: (q: string) => void;
}) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (onSearch) onSearch(q.trim());
        else router.push(`/${kind}?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex min-w-0 flex-col gap-2 min-[480px]:flex-row"
    >
      <Field
        id={`catalog-search-${kind}`}
        aria-label={t.search}
        placeholder={
          kind === "products" ? t.searchPlaceholder : t.supplierPlaceholder
        }
        value={q}
        onValueChange={setQ}
        maxLength={128}
        prefix={<IconSearch />}
        className="min-w-0 flex-1"
      />
      <Button radius={6} htmlType="submit">
        {t.search}
      </Button>
    </form>
  );
}
