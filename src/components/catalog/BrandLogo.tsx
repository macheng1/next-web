"use client";
import Image from "next/image";
import { useFoundation } from "../Providers";
export function BrandLogo({
  inverse = false,
  variant = "default",
}: {
  inverse?: boolean;
  variant?: "default" | "auth";
}) {
  const { locale } = useFoundation();
  const auth = variant === "auth" && !inverse;
  const src = inverse
    ? `/brand/logo-${locale}-white.svg`
    : auth
      ? `/brand/logo-${locale}-auth.svg`
      : locale === "en"
        ? "/brand/logo-en.svg"
        : "/brand/logo-horizontal.svg";
  return (
    <Image
      src={src}
      width={auth ? (locale === "en" ? 501 : 393) : 180}
      height={auth ? 102 : 40}
      alt={locale === "en" ? "ManuLink" : "制造帮"}
      className="h-9 w-auto max-w-full object-contain"
    />
  );
}
