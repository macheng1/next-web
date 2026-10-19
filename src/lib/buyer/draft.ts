import type { DraftItem, TradeProduct, Unit } from "./types";
export function validQuantity(value: string, unit: Unit) {
  return (
    /^\d+(\.\d{1,3})?$/.test(value) &&
    Number(value) > 0 &&
    Number(value) <= 999999999 &&
    (!["piece", "set"].includes(unit) || Number.isInteger(Number(value)))
  );
}
export const itemKey = (row: DraftItem) =>
  `${row.productId || row.name}:${row.variantId || row.specification}`;
export function mergeDraftItems(
  current: DraftItem[],
  added: DraftItem[],
): DraftItem[] {
  const rows = current.map((row) => ({ ...row }));
  for (const row of added) {
    if (!validQuantity(row.quantity, row.unit)) throw Error("INVALID_QUANTITY");
    if (rows.some((old) => old.enterpriseId !== row.enterpriseId))
      throw Error("INVALID_SCOPE");
    const index = rows.findIndex((old) => itemKey(old) === itemKey(row));
    if (index < 0) rows.push({ ...row });
    else {
      const quantity = String(
        (Math.round(Number(rows[index].quantity) * 1000) +
          Math.round(Number(row.quantity) * 1000)) /
          1000,
      );
      if (!validQuantity(quantity, row.unit)) throw Error("INVALID_QUANTITY");
      rows[index] = { ...row, quantity };
    }
  }
  if (rows.length > 50) throw Error("INVALID_ITEMS");
  return rows;
}
export function validateDraftItems(
  items: DraftItem[],
  products: TradeProduct[],
  enterpriseId: string,
) {
  if (!items.length || items.length > 50) throw Error("INVALID_ITEMS");
  return items.map((row) => {
    if (row.enterpriseId !== enterpriseId) throw Error("INVALID_SCOPE");
    if (!row.productId) {
      if (
        !row.name.trim() ||
        !row.specification.trim() ||
        !validQuantity(row.quantity, row.unit)
      )
        throw Error("INVALID_ITEMS");
      return row;
    }
    const p = products.find((p) => p.id === row.productId);
    if (!p || !p.canInquire || p.enterpriseId !== enterpriseId)
      throw Error("INVALID_PRODUCT");
    const variant = p.variants.find((v) => v.id === row.variantId);
    if (!variant || !validQuantity(row.quantity, variant.unit))
      throw Error("INVALID_QUANTITY");
    return {
      ...row,
      name: p.name,
      specification: variant.specification,
      unit: variant.unit,
    };
  });
}
export function removeSubmittedItems(
  current: DraftItem[],
  submitted: DraftItem[],
) {
  return current.filter(
    (row) =>
      !submitted.some(
        (sent) =>
          itemKey(sent) === itemKey(row) && sent.quantity === row.quantity,
      ),
  );
}
