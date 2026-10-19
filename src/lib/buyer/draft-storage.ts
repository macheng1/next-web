import type { DraftItem, InquiryDraft } from "./types";
import { mergeDraftItems } from "./draft";
const prefix = "buyer-draft-v1:";
function isItem(value: unknown): value is DraftItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    ["enterpriseId", "name", "specification", "quantity", "unit"].every(
      (key) => typeof item[key] === "string",
    ) && ["piece", "set", "kg", "meter"].includes(String(item.unit))
  );
}
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function listGroups(member: string) {
  const groups: Record<string, DraftItem[]> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix + member + ":")) {
      const rows = read<DraftItem[]>(key, []);
      if (Array.isArray(rows)) {
        const valid = rows.filter(isItem);
        if (valid.length)
          groups[key.slice((prefix + member + ":").length)] = valid;
      }
    }
  }
  return groups;
}
export function saveItems(
  member: string,
  enterprise: string,
  rows: DraftItem[],
) {
  localStorage.setItem(
    prefix + member + ":" + enterprise,
    JSON.stringify(rows),
  );
  window.dispatchEvent(new Event("buyer-data"));
}
export function addItems(
  member: string,
  enterprise: string,
  rows: DraftItem[],
) {
  saveItems(
    member,
    enterprise,
    mergeDraftItems(listGroups(member)[enterprise] || [], rows),
  );
}
function formKey(member: string, enterprise: string, id?: string) {
  return id
    ? `buyer-form-v2:${member}:${id}`
    : `buyer-form-v1:${member}:${enterprise}`;
}
export function saveForm(member: string, draft: InquiryDraft, id?: string) {
  localStorage.setItem(
    formKey(member, draft.enterpriseId, id),
    JSON.stringify({
      ...draft,
      retry: draft.retry ?? readForm(member, draft.enterpriseId, id)?.retry,
      source: "web",
    }),
  );
  window.dispatchEvent(new Event("buyer-data"));
}
export function readForm(
  member: string,
  enterprise: string,
  id?: string,
): InquiryDraft | null {
  return read(formKey(member, enterprise, id), null);
}
export function clearForm(member: string, enterprise: string, id?: string) {
  localStorage.removeItem(formKey(member, enterprise, id));
  window.dispatchEvent(new Event("buyer-data"));
}
export function saveIndependentForm(member: string, draft: InquiryDraft) {
  const id = crypto.randomUUID();
  saveForm(member, draft, id);
  return id;
}
export function rememberSubmission(
  member: string,
  draft: InquiryDraft,
  body: string,
  id?: string,
) {
  const old = readForm(member, draft.enterpriseId, id);
  const key =
    old?.retry?.body === body && /^[0-9a-f-]{36}$/i.test(old.retry.key)
      ? old.retry.key
      : crypto.randomUUID();
  saveForm(member, { ...draft, retry: { body, key } }, id);
  return key;
}
export function claimGuest(member: string) {
  if (sessionStorage.getItem("buyer-claim-guest") !== "1") return;
  for (const [enterprise, rows] of Object.entries(listGroups("guest"))) {
    addItems(member, enterprise, rows);
    localStorage.removeItem(prefix + "guest:" + enterprise);
  }
  sessionStorage.removeItem("buyer-claim-guest");
}
export function listDrafts(member: string) {
  const result: {
    id: string;
    enterpriseId: string;
    independent: boolean;
    draft: InquiryDraft;
  }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const independent = key?.startsWith("buyer-form-v2:" + member + ":");
    if (
      !key ||
      (!independent && !key.startsWith("buyer-form-v1:" + member + ":"))
    )
      continue;
    const draft = read<InquiryDraft | null>(key, null);
    if (
      draft &&
      typeof draft.enterpriseId === "string" &&
      Array.isArray(draft.items)
    )
      result.push({
        id: key.slice(
          (independent ? "buyer-form-v2:" : "buyer-form-v1:").length +
            member.length +
            1,
        ),
        enterpriseId: draft.enterpriseId,
        independent: !!independent,
        draft,
      });
  }
  return result;
}
export function subscribeBuyer(callback: () => void) {
  window.addEventListener("buyer-data", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("buyer-data", callback);
    window.removeEventListener("storage", callback);
  };
}
