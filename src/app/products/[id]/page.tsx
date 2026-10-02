import { notFound } from "next/navigation";
import { CatalogProductDetail } from "@/src/components/catalog/ProductDetail";
import { catalogMetadata } from "@/src/lib/catalog/metadata";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return catalogMetadata("products", `/products/${id}`);
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  return <CatalogProductDetail id={id} />;
}
