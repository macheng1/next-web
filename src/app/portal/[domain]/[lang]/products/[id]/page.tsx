// src/app/portal/[domain]/[lang]/products/[id]/page.tsx

import { ProductDetailContent } from "@/src/components/portal/ProductDetailContent";
import { fetchProductById } from "@/src/lib/server/portal";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ domain: string; lang: string; id: string }>;
}) {
  const { domain, id } = await params;
  const product = await fetchProductById(domain, id); // 获取单个产品详情

  if (!product) return <div className="p-20 text-center">产品信息不存在</div>;

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* 2. 核心内容组件 */}
      <ProductDetailContent product={product} />
    </div>
  );
}
