"use client";
import type { Product } from "@/src/lib/catalog/model";
import { Button } from "../Button";
import { CatalogImage } from "./CatalogImage";

/** Earlier dimensions constrain later ones; selecting a value never changes its parents. */
export function VariantPicker({
  product: p,
  selected,
  onChange,
}: {
  product: Product;
  selected: number;
  onChange: (index: number) => void;
}) {
  const dimensions = p.dimensionNames || [];
  const current = p.variants[selected];
  return (
    <div className="space-y-3">
      {dimensions.map((name, d) => {
        const values = [
          ...new Set(
            p.variants
              .map((v) => v.dimensionValues?.[d])
              .filter((v): v is string => !!v),
          ),
        ];
        return (
          <div key={name} className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center">
            <h2 className="text-sm font-semibold">{name}</h2>
            <div role="group" aria-label={name} className="flex flex-wrap gap-2">
              {values.map((value) => {
                const matches = p.variants
                  .map((v, i) => ({ v, i }))
                  .filter(({ v }) => v.dimensionValues?.[d] === value);
                const candidates = matches.filter(({ v }) =>
                  dimensions.every((_, other) =>
                    other >= d || v.dimensionValues?.[other] === current?.dimensionValues?.[other],
                  ),
                );
                const best = candidates.find(({ v }) =>
                  dimensions.every((_, other) =>
                    other <= d || v.dimensionValues?.[other] === current?.dimensionValues?.[other],
                  ),
                ) || candidates[0];
                const optionImage = (best || matches[0])?.v.imageUrl || p.images[0];
                const active = current?.dimensionValues?.[d] === value;
                return (
                  <Button
                    radius={6}
                    key={value}
                    variant={active ? "secondary" : "outline"}
                    aria-pressed={active}
                    disabled={!best}
                    onClick={() => { if (best && best.i !== selected) onChange(best.i); }}
                    className="h-auto! min-h-11 whitespace-normal!"
                  >
                    <span className="flex items-center gap-2">
                      <span className="relative h-8 w-8 shrink-0">
                        <CatalogImage src={optionImage} alt="" compact />
                      </span>
                      {value}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
