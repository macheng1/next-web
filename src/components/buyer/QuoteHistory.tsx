"use client";
import { useState } from "react";
import Link from "next/link";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import { buyerCopy, inquiryStatus } from "@/src/lib/buyer/copy";
import { money } from "@/src/lib/buyer/chat";
import type { Quote, Page } from "@/src/lib/buyer/types";
import { BuyerStatus, BuyerPagination } from "./BuyerUI";
import styles from "./buyer.module.css";
function QuoteHistoryContents({
  inquiryId,
  onClose,
}: {
  inquiryId: string;
  onClose: () => void;
}) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const [page, setPage] = useState(1);
  const data = useBuyer<Page<Quote>>(
    `inquiries/${inquiryId}/quotes?page=${page}`,
  );
  return (
    <>
      <BuyerStatus {...data} />
      {data.data && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.revision}</th>
                <th>{t.status}</th>
                <th>{t.total}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.items.map((q) => (
                <tr key={q.id}>
                  <td>V{q.revision}</td>
                  <td>{inquiryStatus(q.status, locale)}</td>
                  <td>{money(q.totalAmount, q.currency)}</td>
                  <td>
                    <Link
                      className={styles.link}
                      href={"/buyer/quotes/" + q.id}
                      onClick={onClose}
                    >
                      {t.view}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <BuyerPagination
            page={page}
            total={data.data.total}
            setPage={setPage}
          />
        </div>
      )}
    </>
  );
}
export function QuoteHistory({ inquiryId }: { inquiryId: string }) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t.quoteHistory}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t.quoteHistory}
        width={680}
        footer={
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.close}
          </Button>
        }
      >
        {open && (
          <QuoteHistoryContents
            inquiryId={inquiryId}
            onClose={() => setOpen(false)}
          />
        )}
      </Modal>
    </>
  );
}
