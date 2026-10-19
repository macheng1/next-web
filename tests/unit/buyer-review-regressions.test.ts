import { it, expect, vi, afterEach } from "vitest";
import {
  saveForm,
  readForm,
  saveIndependentForm,
  listDrafts,
  rememberSubmission,
} from "../../src/lib/buyer/draft-storage";
import { readKnownReceipts } from "../../src/lib/buyer/chat";
import type { InquiryDraft } from "../../src/lib/buyer/types";
afterEach(() => vi.unstubAllGlobals());
function storage() {
  const values = new Map<string, string>();
  const s = {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] || null,
  };
  vi.stubGlobal("localStorage", s);
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  return s;
}
const draft: InquiryDraft = {
  enterpriseId: "enterprise",
  subject: "Existing demand",
  description: "304 SS",
  contactName: "A",
  contactPhone: "12345678",
  orderKind: "standard",
  items: [],
  attachments: [],
};
it("keeps a submission key across reload/re-login until the body changes", () => {
  storage();
  saveForm("A", draft);
  const first = rememberSubmission("A", draft, '{"subject":"same"}');
  const restored = readForm("A", "enterprise")!;
  expect(rememberSubmission("A", restored, '{"subject":"same"}')).toBe(first);
  expect(rememberSubmission("A", restored, '{"subject":"changed"}')).not.toBe(
    first,
  );
});
it("prepares an independent repeat without overwriting an existing supplier draft", () => {
  storage();
  saveForm("A", draft);
  const id = saveIndependentForm("A", { ...draft, subject: "Repeat" });
  expect(readForm("A", "enterprise")?.subject).toBe("Existing demand");
  expect(readForm("A", "enterprise", id)?.subject).toBe("Repeat");
  expect(listDrafts("A")).toHaveLength(2);
  expect(listDrafts("B")).toHaveLength(0);
});
it("refreshes receipts beyond the first 100 messages", async () => {
  const load = vi.fn(async (after: number) => ({
    items: [{ messageId: String(after + 100), recipientRead: true }],
    hasMore: after < 100,
    nextAfterSequence: after + 100,
  }));
  const result = await readKnownReceipts(load, 0, 180);
  expect(load).toHaveBeenCalledTimes(2);
  expect(result.map((r) => r.messageId)).toEqual(["100", "200"]);
});
it("preserves an unacknowledged upload key across reselection but clears it after acknowledgment", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
  const { uploadRetryKey } = await import("../../src/lib/buyer/upload-retry");
  const file = new File(["%PDF-content"], "drawing.pdf", {
    type: "application/pdf",
  });
  const first = await uploadRetryKey(file, "A", "inquiry");
  const second = await uploadRetryKey(
    new File(["%PDF-content"], "drawing.pdf", { type: "application/pdf" }),
    "A",
    "inquiry",
  );
  expect(second.key).toBe(first.key);
  first.acknowledge();
  expect((await uploadRetryKey(file, "A", "inquiry")).key).not.toBe(first.key);
});
it("sends the mounted expected member on client write requests", async () => {
  const fetch = vi.fn(async () => Response.json({ code: 200, data: {} }));
  vi.stubGlobal("fetch", fetch);
  const { buyerApi } = await import("../../src/lib/buyer/api");
  await buyerApi.write(
    "inquiries",
    {},
    "77777777-7777-4777-8777-777777777777",
    "POST",
    "A",
  );
  const headers = new Headers(
    (fetch.mock.calls as unknown as [string, RequestInit][])[0][1].headers,
  );
  expect(headers.get("x-expected-member-id")).toBe("A");
});
