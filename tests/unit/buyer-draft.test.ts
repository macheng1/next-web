import { it, expect } from "vitest";
import {
  validQuantity,
  mergeDraftItems,
  removeSubmittedItems,
} from "../../src/lib/buyer/draft";
const item = {
  productId: "p",
  variantId: "v",
  enterpriseId: "e",
  name: "Fitting",
  specification: "6 mm",
  quantity: "1",
  unit: "piece" as const,
};
it("accepts unit-specific quantities and rejects overflow", () => {
  expect(validQuantity("1.5", "piece")).toBe(false);
  expect(validQuantity("1.123", "kg")).toBe(true);
  expect(validQuantity("1.1234", "kg")).toBe(false);
  expect(validQuantity("1000000000", "kg")).toBe(false);
});
it("merges real variant keys and guards enterprise scope", () => {
  expect(
    mergeDraftItems([item], [{ ...item, quantity: "2" }])[0].quantity,
  ).toBe("3");
  expect(() =>
    mergeDraftItems([item], [{ ...item, enterpriseId: "other" }]),
  ).toThrow();
});
it("retains items changed during submission", () =>
  expect(
    removeSubmittedItems([{ ...item, quantity: "3" }], [item]),
  ).toHaveLength(1));
