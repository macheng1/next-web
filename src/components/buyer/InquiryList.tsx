"use client";
import { Input, Select } from "@douyinfe/semi-ui-19";
import { useState, useSyncExternalStore, useCallback } from "react";
import Link from "next/link";
import { useFoundation } from "../Providers";
import { buyerCopy, inquiryStatus } from "@/src/lib/buyer/copy";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import {
  subscribeBuyer,
  listDrafts,
  clearForm,
} from "@/src/lib/buyer/draft-storage";
import type { Inquiry, Page } from "@/src/lib/buyer/types";
import { BuyerHead, BuyerStatus, BuyerEmpty, BuyerPagination } from "./BuyerUI";
import { useBuyerMember } from "./BuyerShell";
import { Button } from "../Button";
import { Modal } from "../Modal";
import styles from "./buyer.module.css";
export function InquiryRows({ items }: { items: Inquiry[] }) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  if (!items.length) return <BuyerEmpty />;
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t.subject}</th>
            <th>{t.supplier}</th>
            <th>{t.status}</th>
            <th>{t.updated}</th>
            <th>{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>
                <strong>{i.subject}</strong>
                <small>{i.number}</small>
              </td>
              <td>
                {locale === "en" && i.enterpriseNameEn
                  ? i.enterpriseNameEn
                  : i.enterpriseName}
              </td>
              <td>
                <span className={styles.tag}>
                  {inquiryStatus(i.status, locale)}
                </span>
                {i.unreadCount > 0 && (
                  <small>
                    {t.unread} {i.unreadCount}
                  </small>
                )}
              </td>
              <td>
                {new Date(i.updatedAt).toLocaleDateString(
                  locale === "en" ? "en-GB" : "zh-CN",
                )}
              </td>
              <td>
                <Link className={styles.link} href={"/buyer/inquiries/" + i.id}>
                  {t.open}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function InquiryList() {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    member = useBuyerMember();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [deleting, setDeleting] = useState("");
  const data = useBuyer<Page<Inquiry>>(
    "inquiries?" +
      new URLSearchParams({
        page: String(page),
        ...(status ? { status } : {}),
        ...(search ? { keyword: search } : {}),
      }),
  );
  const snapshot = useSyncExternalStore(
    subscribeBuyer,
    useCallback(() => JSON.stringify(listDrafts(member.id)), [member.id]),
    () => "[]",
  );
  const drafts = JSON.parse(snapshot) as ReturnType<typeof listDrafts>;
  return (
    <>
      <BuyerHead
        title={t.inquiries}
        action={
          <Link className={styles.link} href="/products">
            {t.prepare} →
          </Link>
        }
      />
      <form
        className={`shhy-field ${styles.toolbar}`}
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query.trim());
          setPage(1);
        }}
      >
        <span id="inquiry-status-label" className="sr-only">{t.status}</span>
        <Select
          className={styles.select}
          value={status}
          aria-labelledby="inquiry-status-label"
          optionList={[{value: "", label: t.allStatuses}, ...["pending_reply", "negotiating", "quoted", "closed"].map(s => ({value: s, label: inquiryStatus(s, locale)}))]}
          onChange={(value) => { setStatus(String(value)); setPage(1); }}
        />
        <Input
          className={styles.input}
          value={query}
          maxLength={100}
          aria-label={t.search}
          placeholder={t.search}
          onChange={(_, e) => setQuery(e.target.value)}
        />
        <Button htmlType="submit" variant="outline">
          {t.search}
        </Button>
      </form>
      <BuyerStatus {...data} />
      {data.data && (
        <section className={styles.panel}>
          <InquiryRows items={data.data.items} />
          <BuyerPagination
            page={page}
            total={data.data.total}
            setPage={setPage}
          />
        </section>
      )}
      {drafts.length > 0 && (
        <section className={styles.panel}>
          <h2>{t.localDrafts}</h2>
          <p className={styles.hint}>{t.localNotice}</p>
          {drafts.map(({ id, enterpriseId, independent, draft }) => (
            <div className={styles.actions} key={id}>
              <span>{draft.subject || t.draft}</span>
              <Link
                className={styles.link}
                href={
                  "/buyer/inquiries/new?enterpriseId=" +
                  encodeURIComponent(enterpriseId) +
                  (independent ? "&draftId=" + encodeURIComponent(id) : "")
                }
              >
                {t.edit}
              </Link>
              <Button variant="ghost" onClick={() => setDeleting(id)}>
                {t.deleteDraft}
              </Button>
            </div>
          ))}
        </section>
      )}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting("")}
        title={t.deleteDraft}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting("")}>
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const row = drafts.find((d) => d.id === deleting);
                if (row)
                  clearForm(
                    member.id,
                    row.enterpriseId,
                    row.independent ? row.id : undefined,
                  );
                setDeleting("");
              }}
            >
              {t.deleteDraft}
            </Button>
          </>
        }
      >
        {t.localNotice}
      </Modal>
    </>
  );
}
