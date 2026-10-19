"use client";
import Link from "next/link";
import { useCatalog } from "@/src/lib/catalog/use-catalog";
import type { Enterprise } from "@/src/lib/catalog/model";
import { useFoundation } from "../Providers";
import { buyerCopy } from "@/src/lib/buyer/copy";
import styles from "./buyer.module.css";
export function SupplierGroupTitle({ id }: { id: string }) {
  const { locale } = useFoundation();
  const enterprise = useCatalog<Enterprise>("enterprises/" + id);
  return (
    <Link className={styles.link} href={"/suppliers/" + id}>
      {enterprise.data?.name || buyerCopy(locale).supplier} →
    </Link>
  );
}
