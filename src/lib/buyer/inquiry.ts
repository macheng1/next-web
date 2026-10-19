import type { InquiryDraft } from "./types";
import { validQuantity } from "./draft";
export function inquiryPayload(draft: InquiryDraft) {
  if (
    !draft.enterpriseId ||
    !draft.subject.trim() ||
    draft.subject.length > 200 ||
    !draft.description.trim() ||
    draft.description.length > 2000 ||
    !draft.contactName.trim() ||
    draft.contactName.length > 100 ||
    draft.contactPhone.length > 40 ||
    (draft.contactPhone.match(/\d/g) || []).length < 6
  )
    throw Error("INVALID_FIELDS");
  if (
    !draft.items.length ||
    draft.items.length > 50 ||
    draft.items.some(
      (row) =>
        row.enterpriseId !== draft.enterpriseId ||
        !validQuantity(row.quantity, row.unit) ||
        !["piece", "set", "kg", "meter"].includes(row.unit),
    )
  )
    throw Error("INVALID_ITEMS");
  return {
    enterpriseId: draft.enterpriseId,
    orderKind: draft.orderKind,
    subject: draft.subject.trim(),
    description: draft.description.trim(),
    contactName: draft.contactName.trim(),
    contactPhone: draft.contactPhone.trim(),
    ...(draft.buyerCompanyName?.trim()
      ? { buyerCompanyName: draft.buyerCompanyName.trim() }
      : {}),
    ...(draft.expectedDate ? { expectedDate: draft.expectedDate } : {}),
    items: draft.items.map(
      ({ productId, variantId, name, specification, quantity, unit }) => ({
        ...(productId ? { productId, variantId } : { name, specification }),
        quantity,
        unit,
      }),
    ),
    attachmentIds: draft.attachments.map((f) => f.id),
  };
}
