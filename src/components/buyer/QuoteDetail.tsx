"use client";
import Link from "next/link";
import { useFoundation } from "../Providers";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import {
  buyerCopy,
  inquiryStatus,
  unitLabel,
  productLabels,
} from "@/src/lib/buyer/copy";
import { money } from "@/src/lib/buyer/chat";
import type { Quote } from "@/src/lib/buyer/types";
import { BuyerHead, BuyerStatus } from "./BuyerUI";
import styles from "./buyer.module.css";
const termsLabels: Record<string, [string, string]> = {
  paymentMode: ["Payment schedule", "付款安排"],
  milestones: ["Payment milestones", "付款节点"],
  label: ["Milestone", "节点名称"],
  amount: ["Amount", "金额"],
  dueOn: ["Due trigger", "付款条件"],
  offsetDays: ["Days after trigger", "条件满足后的天数"],
  delivery: ["Delivery", "交付约定"],
  mode: ["Mode", "方式"],
  batchPlans: ["Delivery batches", "交付批次"],
  latestDays: ["Latest lead time (days)", "最晚交付天数"],
  acceptance: ["Acceptance", "验收约定"],
  standard: ["Acceptance standard", "验收标准"],
  withinDays: ["Acceptance window (days)", "验收期限（天）"],
  preShipmentInspection: ["Pre-shipment inspection", "发货前检验"],
  inspectionStandard: ["Inspection standard", "检验标准"],
  aftersaleDays: ["After-sales window (days)", "售后期限（天）"],
  dueAt: ["Due date", "截止时间"],
  items: ["Products", "产品明细"],
  quantity: ["Quantity", "数量"],
  note: ["Notes", "备注"],
  freightBearer: ["Freight payer", "运费承担方"],
};
const termsValues: Record<string, [string, string]> = {
  full_before_ship: ["Full payment before shipping", "发货前付全款"],
  deposit_balance: ["Deposit and balance", "订金与尾款"],
  per_batch: ["Payment per batch", "分批付款"],
  combined: ["Combined receipt and acceptance", "收货验收合并"],
  separate: ["Separate receipt and acceptance", "分别收货与验收"],
  single: ["Single delivery", "一次交付"],
  batch: ["Batch delivery", "分批交付"],
  supplier: ["Supplier", "供应企业"],
  buyer: ["Buyer", "买家"],
  order_accepted: ["Order accepted", "接单后"],
  before_batch: ["Before batch shipment", "本批发货前"],
  before_any_shipment: ["Before any shipment", "发货前"],
  after_acceptance: ["After acceptance", "验收后"],
  before_production: ["Before production", "开工前"],
};
function Terms({ value, currency }: { value: unknown; currency: string }) {
  const { locale } = useFoundation();
  const language = locale === "en" ? 0 : 1;
  if (value === null || value === undefined) return <span>—</span>;
  if (Array.isArray(value))
    return (
      <ul>
        {value.map((item, i) => (
          <li key={i}>
            <Terms value={item} currency={currency} />
          </li>
        ))}
      </ul>
    );
  if (typeof value === "object")
    return (
      <dl>
        {Object.entries(value)
          .filter(
            ([key]) =>
              !["key", "id", "productId", "variantId", "orderItemId"].includes(
                key,
              ),
          )
          .map(([key, v]) => (
            <div key={key} className={styles.notice}>
              <dt>
                {termsLabels[key]?.[language] || key.replace(/([A-Z])/g, " $1")}
              </dt>
              <dd>
                {key === "amount" ? (
                  money(v, currency)
                ) : (
                  <Terms value={v} currency={currency} />
                )}
              </dd>
            </div>
          ))}
      </dl>
    );
  if (typeof value === "boolean")
    return (
      <span>
        {language === 0 ? (value ? "Yes" : "No") : value ? "是" : "否"}
      </span>
    );
  return <span>{termsValues[String(value)]?.[language] || String(value)}</span>;
}
export function QuoteDetail({ id }: { id: string }) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const data = useBuyer<Quote>("quotes/" + id),
    q = data.data;
  return (
    <>
      <BuyerHead title={t.quoteInfo} intro={t.quoteViewOnly} />
      <BuyerStatus {...data} />
      {q && (
        <section className={styles.panel}>
          <div className={styles.row}>
            <h2>
              {q.number} · V{q.revision}
            </h2>
            <span className={styles.tag}>
              {inquiryStatus(q.status, locale)}
            </span>
          </div>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    {t.products} / {t.spec}
                  </th>
                  <th>{t.quantity}</th>
                  <th>{t.price}</th>
                  <th>{t.subtotal}</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.product
                          ? productLabels(item.product, locale).name
                          : item.name}
                      </strong>
                      <small>
                        {item.product
                          ? productLabels(item.product, locale).specification
                          : item.specification}
                      </small>
                    </td>
                    <td>
                      {item.quantity}{" "}
                      {item.product && "unit" in item.product
                        ? unitLabel(item.product.unit, locale)
                        : unitLabel(item.unit, locale)}
                    </td>
                    <td>{money(item.unitPrice, q.currency)}</td>
                    <td>{money(item.subtotal, q.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.total}>
            {t.total} · {money(q.totalAmount, q.currency)}
          </div>
          <div className={styles.grid}>
            {[
              [t.currency, q.currency],
              [t.freight, money(q.freightAmount, q.currency)],
              [t.tax, money(q.taxAmount, q.currency)],
              [t.expectedDate, String(q.expectedReadyDate || "—")],
              [t.created, String(q.createdAt || "—")],
              [
                locale === "en" ? "Valid until" : "报价有效期",
                String(q.validUntil || "—"),
              ],
            ].map(([key, value]) => (
              <div key={key} className={styles.notice}>
                <strong>{key}</strong>
                <p>{value}</p>
              </div>
            ))}
          </div>
          <h2>{t.terms}</h2>
          <Terms value={q.terms} currency={q.currency} />
          {typeof q.inquiryId === "string" && (
            <Link
              className={styles.link}
              href={"/buyer/inquiries/" + q.inquiryId}
            >
              {t.detail} →
            </Link>
          )}
        </section>
      )}
    </>
  );
}
