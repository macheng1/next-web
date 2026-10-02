"use client";
import Image from "next/image";
import { useState } from "react";
import { safeCatalogImage } from "@/src/lib/catalog/model";
export function CatalogImage({
  src,
  alt,
  company = false,
  priority = false,
  cover = false,
  compact = false,
}: {
  src?: string | null;
  alt: string;
  company?: boolean;
  priority?: boolean;
  cover?: boolean;
  compact?: boolean;
}) {
  const url = safeCatalogImage(src);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <Image
      src={
        url && failed !== url
          ? url
          : `/catalog/${company ? "company" : "product"}.svg`
      }
      alt={alt}
      fill
      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 33vw"
      className={
        cover && url && failed !== url
          ? "object-cover"
          : compact
            ? "object-contain p-1"
            : "object-contain p-4"
      }
      priority={priority}
      unoptimized
      onError={() => setFailed(url)}
    />
  );
}
