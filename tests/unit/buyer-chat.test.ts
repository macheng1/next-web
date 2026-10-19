import { it, expect } from "vitest";
import { money, mergeMessages } from "../../src/lib/buyer/chat";
it("formats large minor-unit amounts without precision loss", () => {
  expect(money("70000", "CNY")).toBe("CNY 700.00");
  expect(money("999999999999", "EUR")).toBe("EUR 9999999999.99");
  expect(money(null)).toBe("—");
});
it("deduplicates a replayed response and orders by sequence", () => {
  const first = { id: "1", sequence: 1 } as never,
    second = { id: "2", sequence: 2 } as never;
  expect(mergeMessages([second], [first, second]).map((m) => m.id)).toEqual([
    "1",
    "2",
  ]);
});
