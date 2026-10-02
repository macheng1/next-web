import { notFound } from "next/navigation";
import { CatalogEnterpriseDetail } from "@/src/components/catalog/EnterpriseDetail";
import { catalogMetadata } from "@/src/lib/catalog/metadata";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return catalogMetadata("suppliers", `/suppliers/${id}`);
}
export default async function SupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  return <CatalogEnterpriseDetail id={id} />;
}
