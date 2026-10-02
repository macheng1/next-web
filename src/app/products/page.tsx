import { Suspense } from "react";
import { CatalogDirectory } from "@/src/components/catalog/Directory";
import { catalogMetadata } from "@/src/lib/catalog/metadata";
export const generateMetadata = () => catalogMetadata("products", "/products");
export default function ProductsPage() {
  return (
    <Suspense>
      <CatalogDirectory />
    </Suspense>
  );
}
