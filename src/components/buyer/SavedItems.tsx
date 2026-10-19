"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import { buyerApi } from "@/src/lib/buyer/api";
import type { Page } from "@/src/lib/buyer/types";
import {
  safeCatalogImage,
  type Product,
  type Enterprise,
} from "@/src/lib/catalog/model";
import { useBuyerMember } from "./BuyerShell";
import { BuyerHead, BuyerStatus, BuyerEmpty, BuyerPagination } from "./BuyerUI";
import { ProductBuyerActions } from "./ProductBuyerActions";
import styles from "./buyer.module.css";
type Favorite = {
  targetType: "product" | "enterprise";
  targetId: string;
  payload: Product | Enterprise | null;
};
export function SavedItems() {
  const { locale } = useFoundation(),
    t = buyerCopy(locale);
  const [type, setType] = useState<"product" | "enterprise">("product"),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const member = useBuyerMember();
  const data = useBuyer<Page<Favorite>>(
    `favorites?targetType=${type}&locale=${locale}&page=${page}`,
  );
  async function remove(id: string) {
    setBusy(id);
    try {
      await buyerApi.write(
        "favorites",
        { targetType: type, targetId: id, favorited: false },
        undefined,
        "PUT",
        member.id,
      );
      data.retry();
      window.dispatchEvent(new Event("buyer-data"));
    } catch {
      setError(t.failed);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <BuyerHead title={t.saved} intro={t.savedIntro} />
      <div className={styles.toolbar}>
        <Button
          variant={type === "product" ? "secondary" : "outline"}
          onClick={() => {
            setType("product");
            setPage(1);
          }}
        >
          {t.products}
        </Button>
        <Button
          variant={type === "enterprise" ? "secondary" : "outline"}
          onClick={() => {
            setType("enterprise");
            setPage(1);
          }}
        >
          {t.companies}
        </Button>
      </div>
      <BuyerStatus {...data} />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {data.data && !data.data.items.length && <BuyerEmpty />}
      <div className={styles.cards}>
        {data.data?.items.map((row) => {
          const p = row.payload;
          const image = p ? ("images" in p ? p.images[0] : p.logoUrl) : null;
          return (
            <article className={styles.card} key={row.targetId}>
              <div className={styles.art}>
                {safeCatalogImage(image) ? (
                  <Image
                    src={safeCatalogImage(image)!}
                    width={150}
                    height={150}
                    unoptimized
                    alt=""
                  />
                ) : (
                  <span>{p ? t.products : t.unavailable}</span>
                )}
              </div>
              <h2>{p?.name || t.unavailable}</h2>
              {p && (
                <Link
                  className={styles.link}
                  href={
                    (type === "product" ? "/products/" : "/suppliers/") +
                    row.targetId
                  }
                >
                  {t.view} →
                </Link>
              )}
              <div className={styles.actions}>
                <Button
                  variant="ghost"
                  disabled={busy === row.targetId}
                  onClick={() => void remove(row.targetId)}
                >
                  {t.remove}
                </Button>
              </div>
              {p && type === "product" && (
                <ProductBuyerActions
                  product={p as Product}
                  variantIndex={0}
                  quantity={1}
                  compact
                />
              )}
            </article>
          );
        })}
      </div>
      {data.data && (
        <BuyerPagination
          page={page}
          total={data.data.total}
          setPage={setPage}
        />
      )}
    </>
  );
}
