"use client";
import Image from "next/image";
import { Button } from "../Button";
import { safeReturnTo } from "@/src/lib/auth/return-to";
import { useFoundation } from "../Providers";
import { authCopy } from "@/src/lib/auth/copy";
import styles from "./auth.module.css";
export function GoogleButton({
  returnTo = "/buyer",
  disabled = false,
}: {
  returnTo?: string;
  disabled?: boolean;
}) {
  const { locale } = useFoundation();
  const t = authCopy(locale);
  return (
    <Button
      block
      variant="outline"
      size="lg"
      radius={8}
      htmlType="button"
      className={styles.googleButton}
      tone={{ bg: "#ffffff", fg: "#1f1f1f", border: "#747775" }}
      icon={
        <Image
          src="/brand/google-g.png"
          width={20}
          height={20}
          alt=""
          unoptimized
        />
      }
      disabled={disabled}
      onClick={() => {
        const url = new URL("/api/auth/google/start", window.location.origin);
        url.search = new URLSearchParams({
          returnTo: safeReturnTo(returnTo),
          locale,
        }).toString();
        window.location.assign(url.toString());
      }}
    >
      {t.continueGoogle}
    </Button>
  );
}
