"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/src/lib/catalog/model";
import type { Unit, TradeProduct } from "@/src/lib/buyer/types";
import { checkSession } from "@/src/lib/auth-api";
import { addItems } from "@/src/lib/buyer/draft-storage";
import { buyerApi } from "@/src/lib/buyer/api";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { useFoundation } from "../Providers";
import { Button } from "../Button";
import styles from "./buyer.module.css";
export function FavoriteAction({
  id,
  type,
}: {
  id: string;
  type: "product" | "enterprise";
}) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    router = useRouter();
  const [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    checkSession()
      .then(async (session) => {
        if (session.status === "authenticated") {
          const state = await buyerApi.get<{ favorited: boolean }>(
            `favorites/${type}/${id}`,
          );
          if (active) setSaved(state.favorited);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [type, id]);
  async function toggle() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const session = await checkSession();
      if (session.status === "unavailable") throw Error("unavailable");
      if (session.status !== "authenticated") {
        router.push(
          "/login?returnTo=" + encodeURIComponent(window.location.pathname),
        );
        return;
      }
      await buyerApi.write(
        "favorites",
        { targetType: type, targetId: id, favorited: !saved },
        undefined,
        "PUT",
        session.member.id,
      );
      setSaved(!saved);
      window.dispatchEvent(new Event("buyer-data"));
    } catch {
      setError(t.failed);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant={saved ? "secondary" : "outline"}
        aria-pressed={saved}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {saved ? t.saved : t.save}
      </Button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
export function ProductBuyerActions({
  product: p,
  variantIndex,
  quantity,
  compact = false,
}: {
  product: Product;
  variantIndex: number;
  quantity: number;
  compact?: boolean;
}) {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    router = useRouter();
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function add(prepare: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const session = await checkSession();
      if (session.status === "unavailable") throw Error("unavailable");
      const selected = p.variants[variantIndex];
      if (!selected) throw Error("INVALID_PRODUCT");
      let unit: Unit =
        selected.unit ||
        (
          {
            piece: "piece",
            set: "set",
            kg: "kg",
            meter: "meter",
            件: "piece",
            套: "set",
            千克: "kg",
            米: "meter",
          } as Record<string, Unit>
        )[p.unit || ""] ||
        "piece";
      if (session.status === "authenticated") {
        const actual = await buyerApi.get<TradeProduct>("products/" + p.id);
        const variant = actual.variants.find((v) => v.id === selected.id);
        if (!actual.canInquire || !variant) throw Error("INVALID_PRODUCT");
        unit = variant.unit;
      }
      const member =
        session.status === "authenticated" ? session.member.id : "guest";
      addItems(member, p.enterprise.id, [
        {
          enterpriseId: p.enterprise.id,
          productId: p.id,
          variantId: selected.id,
          name: p.name,
          specification: selected.value,
          quantity: String(quantity),
          unit,
        },
      ]);
      setNotice(t.added);
      if (session.status !== "authenticated") {
        sessionStorage.setItem("buyer-claim-guest", "1");
        router.push(
          "/login?returnTo=" +
            encodeURIComponent(
              prepare
                ? "/buyer/inquiries/new?enterpriseId=" + p.enterprise.id
                : "/buyer/list",
            ),
        );
      } else if (prepare)
        router.push(
          "/buyer/inquiries/new?enterpriseId=" +
            encodeURIComponent(p.enterprise.id),
        );
    } catch {
      setNotice(t.invalid);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      <div className={styles.actions}>
        {!compact && <FavoriteAction id={p.id} type="product" />}
        <Button
          variant={compact ? "secondary" : "outline"}
          disabled={busy || !p.variants.length || p.canInquire === false}
          onClick={() => void add(false)}
        >
          {t.addList}
        </Button>
        {!compact && (
          <Button
            disabled={busy || !p.variants.length || p.canInquire === false}
            onClick={() => void add(true)}
          >
            {t.sendInquiry}
          </Button>
        )}
      </div>
      {p.canInquire === false && (
        <p className={styles.hint}>
          {locale === "en"
            ? "This supplier is not currently accepting inquiries, or the product unit is unavailable."
            : "企业暂未开通询盘，或产品计量单位尚未完善。"}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.hint}>
          {notice}
        </p>
      )}
    </div>
  );
}
