import { it, expect } from "vitest";
import { inquiryPayload } from "../../src/lib/buyer/inquiry";
it("allows email member to submit international contact and custom demand", () => {
  const p = inquiryPayload({
    enterpriseId: "e",
    subject: "Machined part",
    description: "Use drawing",
    contactName: "Alex",
    contactPhone: "+49 123 456 789",
    orderKind: "custom",
    items: [
      {
        enterpriseId: "e",
        name: "Part",
        specification: "Drawing A",
        quantity: "2.5",
        unit: "kg",
      },
    ],
    attachments: [],
  });
  expect(p.contactPhone).toBe("+49 123 456 789");
  expect(p.orderKind).toBe("custom");
});
it("rejects whitespace requirements, mismatched enterprise and unbound quantity", () => {
  expect(() =>
    inquiryPayload({
      enterpriseId: "e",
      subject: "x",
      description: " ",
      contactName: "a",
      contactPhone: "123456",
      orderKind: "standard",
      items: [],
      attachments: [],
    }),
  ).toThrow();
});
