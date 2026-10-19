"use client";
import { Input } from "@douyinfe/semi-ui-19";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { listGroups, saveItems } from "@/src/lib/buyer/draft-storage";
import { itemKey, validQuantity } from "@/src/lib/buyer/draft";
import type { DraftItem } from "@/src/lib/buyer/types";
import { useBuyerMember } from "./BuyerShell";
import { BuyerHead, BuyerEmpty } from "./BuyerUI";
import { SupplierGroupTitle } from "./SupplierGroupTitle";
import styles from "./buyer.module.css";
export function SourcingList() {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    member = useBuyerMember();
  const [groups, setGroups] = useState<Record<string, DraftItem[]>>({}),
    [ready, setReady] = useState(false),
    [remove, setRemove] = useState<{ enterprise: string; key: string } | null>(
      null,
    ),
    [error, setError] = useState("");
  useEffect(() => {
    const sync = () => {
      setGroups(listGroups(member.id));
      setReady(true);
    };
    sync();
    window.addEventListener("buyer-data", sync);
    return () => window.removeEventListener("buyer-data", sync);
  }, [member.id]);
  return (
    <>
      <BuyerHead
        title={t.list}
        intro={t.listIntro}
        action={
          <Link className={styles.link} href="/products">
            ＋ {t.add}
          </Link>
        }
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {ready && !Object.keys(groups).length && <BuyerEmpty />}
      {Object.entries(groups).map(([enterprise, rows]) => (
        <section className={styles.panel} key={enterprise}>
          <div className={styles.row}>
            <SupplierGroupTitle id={enterprise} />
            <span className={styles.hint}>{t.groupHint}</span>
          </div>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    {t.products} / {t.spec}
                  </th>
                  <th>{t.quantity}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={itemKey(row)}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.specification}</small>
                    </td>
                    <td className="shhy-field">
                      <div className={styles.quantityControl}>
                        <Input
                          className={styles.quantity}
                          value={row.quantity}
                          inputMode="decimal"
                          aria-label={row.name + " " + t.quantity}
                          onChange={(_, e) => {
                            const next = rows.map((r, i) =>
                              i === index
                                ? { ...r, quantity: e.target.value }
                                : r,
                            );
                            saveItems(member.id, enterprise, next);
                          }}
                          onBlur={() =>
                            setError(
                              validQuantity(row.quantity, row.unit)
                                ? ""
                                : t.invalid,
                            )
                          }
                        />
                        <span>{t[row.unit]}</span>
                      </div>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setRemove({ enterprise, key: itemKey(row) })
                        }
                      >
                        {t.remove}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.actions}>
            <Link
              className={styles.link}
              href={
                "/buyer/inquiries/new?enterpriseId=" +
                encodeURIComponent(enterprise)
              }
            >
              {t.prepare} →
            </Link>
          </div>
        </section>
      ))}
      <p className={styles.hint}>{t.localNotice}</p>
      <Modal
        open={!!remove}
        onClose={() => setRemove(null)}
        title={t.confirmRemove}
        footer={
          <>
            <Button variant="outline" onClick={() => setRemove(null)}>
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (remove)
                  saveItems(
                    member.id,
                    remove.enterprise,
                    groups[remove.enterprise].filter(
                      (row) => itemKey(row) !== remove.key,
                    ),
                  );
                setRemove(null);
              }}
            >
              {t.remove}
            </Button>
          </>
        }
      >
        {t.localNotice}
      </Modal>
    </>
  );
}
