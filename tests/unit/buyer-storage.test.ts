import { it, expect, vi } from "vitest";
import { listGroups } from "../../src/lib/buyer/draft-storage";
it("ignores malformed local draft rows without crashing the workspace", () => {
  const key = "buyer-draft-v1:member:enterprise";
  vi.stubGlobal("localStorage", {
    length: 1,
    key: () => key,
    getItem: () =>
      JSON.stringify([
        null,
        { quantity: 1 },
        {
          enterpriseId: "enterprise",
          name: "Valid",
          specification: "6 mm",
          quantity: "1",
          unit: "piece",
        },
      ]),
  });
  const groups = listGroups("member");
  expect(groups.enterprise).toHaveLength(1);
  expect(groups.enterprise[0].name).toBe("Valid");
  vi.unstubAllGlobals();
});
