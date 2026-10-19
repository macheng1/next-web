"use client";
import { DatePicker, Select } from "@douyinfe/semi-ui-19";
import { Field, FieldShell } from "../Field";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { useBuyerMember } from "./BuyerShell";
import { BuyerHead } from "./BuyerUI";
import { AttachmentPicker } from "./AttachmentPicker";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { buyerApi } from "@/src/lib/buyer/api";
import { buyerError } from "@/src/lib/buyer/errors";
import { inquiryPayload } from "@/src/lib/buyer/inquiry";
import {
  validateDraftItems,
  removeSubmittedItems,
} from "@/src/lib/buyer/draft";
import {
  listGroups,
  readForm,
  saveForm,
  saveItems,
  clearForm,
  rememberSubmission,
} from "@/src/lib/buyer/draft-storage";
import type {
  InquiryDraft,
  Inquiry,
  TradeProduct,
  Unit,
} from "@/src/lib/buyer/types";
import styles from "./buyer.module.css";
export function InquiryForm({
  enterpriseId,
  draftId,
}: {
  enterpriseId: string;
  draftId?: string;
}) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    member = useBuyerMember(),
    router = useRouter();
  const [draft, setDraft] = useState<InquiryDraft>({
    enterpriseId,
    subject: "",
    description: "",
    contactName: member.nickname || "",
    contactPhone: "",
    orderKind: "standard",
    items: [],
    attachments: [],
  });
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [notice, setNotice] = useState("");
  const lock = useRef(false),
    replay = useRef<{ body: string; key: string } | null>(null);
  useEffect(() => {
    const saved = readForm(member.id, enterpriseId, draftId);
    const rows = listGroups(member.id)[enterpriseId] || [];
    setDraft(
      saved
        ? { ...saved, ...(saved.fromList !== false ? { items: rows } : {}) }
        : {
            enterpriseId,
            subject: "",
            description: "",
            contactName: member.nickname || "",
            contactPhone: "",
            orderKind: "standard",
            fromList: rows.length > 0,
            items: rows.length
              ? rows
              : [
                  {
                    enterpriseId,
                    name: "",
                    specification: "",
                    quantity: "1",
                    unit: "piece",
                  },
                ],
            attachments: [],
          },
    );
    setReady(true);
  }, [member.id, member.nickname, enterpriseId, draftId]);
  function field<K extends keyof InquiryDraft>(key: K, value: InquiryDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function save() {
    saveForm(member.id, draft, draftId);
    setNotice(t.draftSaved);
  }
  async function submit() {
    if (lock.current || uploading) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      saveForm(member.id, draft, draftId);
      const products = await Promise.all(
        [
          ...new Set(
            draft.items
              .map((i) => i.productId)
              .filter((id): id is string => !!id),
          ),
        ].map((id) => buyerApi.get<TradeProduct>("products/" + id)),
      );
      const fresh = {
        ...draft,
        items: validateDraftItems(draft.items, products, enterpriseId),
      };
      const payload = inquiryPayload(fresh),
        body = JSON.stringify(payload);
      replay.current = {
        body,
        key: rememberSubmission(member.id, draft, body, draftId),
      };
      await Promise.all(
        fresh.attachments.map((file) =>
          buyerApi.get("files/" + file.id + "/access"),
        ),
      );
      const result = await buyerApi.write<Inquiry>(
        "inquiries",
        payload,
        replay.current!.key,
        "POST",
        member.id,
      );
      if (fresh.fromList !== false)
        saveItems(
          member.id,
          enterpriseId,
          removeSubmittedItems(
            listGroups(member.id)[enterpriseId] || [],
            fresh.items,
          ),
        );
      clearForm(member.id, enterpriseId, draftId);
      router.push("/buyer/inquiries/" + result.id);
    } catch (error) {
      setNotice(buyerError(error, locale));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!enterpriseId)
    return (
      <>
        <BuyerHead title={t.newInquiry} />
        <p className={styles.error}>{t.invalid}</p>
        <Link href="/suppliers">{t.browseSuppliers}</Link>
      </>
    );
  return (
    <>
      <BuyerHead title={t.newInquiry} intro={t.groupHint} />
      <form
        className={styles.panel}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset disabled={busy || !ready} inert={busy || !ready} className={styles.formFields}>
        <Link className={styles.link} href={"/suppliers/" + enterpriseId}>
          {t.profile} →
        </Link>
        <FieldShell className={styles.field} label={t.orderKind} id="order-kind">
          <Select
            disabled={busy || !ready}
            style={{ width: "100%" }}
            aria-labelledby="order-kind-label"
            value={draft.orderKind}
            optionList={[{ value: "standard", label: t.standard }, { value: "custom", label: t.custom }]}
            onChange={(value) => field("orderKind", value as "standard" | "custom")}
          />
        </FieldShell>
        <Field
          className={styles.field}
          label={t.subject}
          required
          maxLength={200}
          value={draft.subject}
          onChange={(e) => field("subject", e.target.value)}
        />
        {draft.items.map((item, index) => (
          <div className={styles.notice} key={item.productId || index}>
            <strong>{item.name}</strong>
            <p>
              {item.specification} · {item.quantity} {t[item.unit]}
            </p>
            {!item.productId && (
              <div className={styles.grid}>
                <Field
                  className={styles.field}
                  label={t.products}
                  required
                  maxLength={200}
                  value={item.name}
                  onChange={(e) =>
                    field(
                      "items",
                      draft.items.map((r, i) =>
                        i === index ? { ...r, name: e.target.value } : r,
                      ),
                    )
                  }
                />
                <Field
                  className={styles.field}
                  label={t.spec}
                  required
                  maxLength={500}
                  value={item.specification}
                  onChange={(e) =>
                    field(
                      "items",
                      draft.items.map((r, i) =>
                        i === index
                          ? { ...r, specification: e.target.value }
                          : r,
                      ),
                    )
                  }
                />
                <Field
                  className={styles.field}
                  label={t.quantity}
                  inputMode="decimal"
                  required
                  value={item.quantity}
                  onChange={(e) =>
                    field(
                      "items",
                      draft.items.map((r, i) =>
                        i === index ? { ...r, quantity: e.target.value } : r,
                      ),
                    )
                  }
                />
                <FieldShell className={styles.field} label={t.unitLabel} id={`unit-${index}`}>
                  <Select
            disabled={busy || !ready}
                    style={{ width: "100%" }}
                    aria-labelledby={`unit-${index}-label`}
                    value={item.unit}
                    optionList={(["piece", "set", "kg", "meter"] as const).map(unit => ({value: unit, label: t[unit]}))}
                    onChange={(value) => field("items", draft.items.map((r, i) => i === index ? { ...r, unit: value as Unit } : r))}
                  />
                </FieldShell>
              </div>
            )}
          </div>
        ))}
        {draft.items.length === 0 && ready && (
          <Button
            variant="outline"
            onClick={() =>
              field("items", [
                {
                  enterpriseId,
                  name: "",
                  specification: "",
                  quantity: "1",
                  unit: "piece",
                },
              ])
            }
          >
            {t.add}
          </Button>
        )}
        {draft.items.some((i) => i.productId) && (
          <Link className={styles.link} href="/buyer/list">
            {t.edit} {t.list} →
          </Link>
        )}
        <Field
          className={styles.field}
          label={t.requirements}
          multiline
          required
          maxLength={2000}
          value={draft.description}
          onChange={(e) => field("description", e.target.value)}
        />
        <div className={styles.grid}>
          <Field
            className={styles.field}
            label={t.contactName}
            required
            maxLength={100}
            autoComplete="name"
            value={draft.contactName}
            onChange={(e) => field("contactName", e.target.value)}
          />
          <Field
            className={styles.field}
            label={t.contactPhone}
            required
            maxLength={40}
            type="tel"
            autoComplete="tel"
            value={draft.contactPhone}
            onChange={(e) => field("contactPhone", e.target.value)}
          />
          <Field
            className={styles.field}
            label={t.buyerCompanyName}
            maxLength={200}
            value={draft.buyerCompanyName || ""}
            onChange={(e) => field("buyerCompanyName", e.target.value)}
          />
          <FieldShell className={styles.field} label={t.expectedDate} id="expected-date">
            <DatePicker
              disabled={busy || !ready}
              type="date"
              format="yyyy-MM-dd"
              onChangeWithDateFirst={false}
              showClear
              onClear={() => field("expectedDate", "")}
              inputStyle={{ width: "100%" }}
              style={{ width: "100%" }}
              aria-labelledby="expected-date-label"
              value={draft.expectedDate || undefined}
              onChange={(value) => field("expectedDate", typeof value === "string" ? value : "")}
            />
          </FieldShell>
        </div>
        <AttachmentPicker
          files={draft.attachments}
          onChange={(files) => field("attachments", files)}
          purpose="inquiry"
          onBusy={setUploading}
          disabled={busy || !ready}
        />
        {notice && (
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        )}
        <div className={styles.actions}>
          <Button
            variant="outline"
            disabled={busy || uploading || !ready}
            onClick={save}
          >
            {t.saveDraft}
          </Button>
          <Button
            htmlType="submit"
            loading={busy}
            disabled={uploading || !ready || !draft.items.length}
          >
            {busy ? t.submitting : t.submit}
          </Button>
        </div>
        <p className={styles.hint}>{t.localNotice}</p>
        </fieldset>
      </form>
    </>
  );
}
