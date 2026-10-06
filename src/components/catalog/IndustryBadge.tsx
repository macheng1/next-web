"use client";
import { useState } from "react";
import Image from "next/image";
import { IconApps } from "@douyinfe/semi-icons";
import { safeCatalogImage } from "@/src/lib/catalog/model";

export function IndustryBadge({ image, badge }: { image?: string | null; badge?: string | null }) {
  const url = safeCatalogImage(image);
  const [failed, setFailed] = useState<string | null>(null);
  return url && failed !== url ? (
    <Image src={url} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-contain" onError={() => setFailed(url)} />
  ) : badge ? (
    <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center font-semibold">{badge}</span>
  ) : <IconApps size="extra-large" />;
}
