import { Suspense } from "react";
import { CatalogDirectory } from "@/src/components/catalog/Directory";
import { catalogMetadata } from "@/src/lib/catalog/metadata";
export const generateMetadata = () =>
  catalogMetadata("suppliers", "/suppliers");
export default function SuppliersPage() {
  return (
    <Suspense>
      <CatalogDirectory kind="suppliers" />
    </Suspense>
  );
}
