export interface EnterpriseSummary {
  id: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  description?: string | null;
  industryCode?: string;
}
export interface Product {
  id: string;
  name: string;
  images: string[];
  category: string;
  categoryCode?: string | null;
  enterprise: EnterpriseSummary;
  material?: string | null;
  connection?: string | null;
  description: string | null;
  unit: string | null;
  brand: string | null;
  attributes: { name: string; value: string }[];
  dimensionNames?: string[];
  variantName: string;
  variants: {
    id: string;
    dimensionValues?:string[];
    value: string;
    imageUrl: string | null;
    price: string | null;
    minOrder: string | null;
  }[];
}
export interface Enterprise extends EnterpriseSummary {
  coverUrl?:string|null; capabilities?:{code:string;name:string}[];
  address: string | null;
  foundedYear: number | null;
  albums: { id: string; imageUrl: string; title?: string }[];
  products: Product[];
}
export interface CatalogPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface CatalogOptions {
  categories: string[];
  categoryOptions?:{value:string;label:string;count:number}[];
  industries: { code: string; name: string }[];
  categoryCounts?: Record<string, number>;
  facets?: {
    material: { value: string; label?:string; count: number }[];
    connection: { value: string; label?:string; count: number }[];
    size: { value: string; label?:string; count: number }[];
  };
}
export const catalogKeys = [
  "locale",
  "q",
  "category",
  "material",
  "connection",
  "size",
  "industry",
  "sort",
  "page",
  "pageSize",
] as const;
export function catalogQuery(input: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const key of catalogKeys) {
    const value = input.get(key);
    if (value) out.set(key, value);
  }
  return out.toString();
}
export function safeCatalogImage(value?: string | null): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.hostname === "macheng123.oss-cn-hangzhou.aliyuncs.com" &&
      ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? (() => {
          u.protocol = "https:";
          return u.href;
        })()
      : null;
  } catch {
    return null;
  }
}

export interface CatalogHomeData {hero:{title?:string;description?:string};imageUrl?:string|null;industries:{code:string;name:string}[];products:Product[]}

export function isCatalogPath(path:string):boolean {
 const uuid="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
 return new RegExp(`^(?:home|footer|options|products(?:/${uuid})?|enterprises(?:/${uuid}(?:/products)?)?)$`,"i").test(path);
}

export interface CatalogFooterData {tagline?:string;description?:string;companyName?:string;year?:number;groups?:{title?:string;links:{label?:string;href:string}[]}[];socialLinks?:Partial<Record<"x"|"instagram"|"linkedin"|"youtube"|"facebook",string>>}
