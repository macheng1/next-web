import type { Message } from "./types";
export function mergeMessages(current: Message[], incoming: Message[]) {
  return [
    ...new Map(
      [...current, ...incoming].map((item) => [item.id, item]),
    ).values(),
  ].sort((a, b) => a.sequence - b.sequence);
}
export function money(value: unknown, currency = "CNY") {
  if (typeof value !== "string" && typeof value !== "number") return "—";
  if (!/^\d+$/.test(String(value))) return "—";
  const n = BigInt(value);
  return `${currency} ${n / BigInt(100)}.${String(n % BigInt(100)).padStart(2, "0")}`;
}

export interface Receipt {
  messageId: string;
  recipientRead: boolean;
  quote?: Message["quote"];
}
export async function readKnownReceipts(
  load: (
    cursor: number,
  ) => Promise<{
    items: Receipt[];
    hasMore: boolean;
    nextAfterSequence: number;
  }>,
  first: number,
  last: number,
) {
  let cursor = first;
  const items: Receipt[] = [];
  while (cursor < last) {
    const page = await load(cursor);
    items.push(...page.items);
    if (!page.hasMore || page.nextAfterSequence <= cursor) break;
    cursor = page.nextAfterSequence;
  }
  return items;
}
