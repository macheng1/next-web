import "server-only";
import { buildMetadata } from "../seo/metadata";
import { isLocale } from "../i18n/locale";
import { foundationCopy } from "../i18n/foundation";
import { fetchTenantData, fetchProductById } from "./portal";
export type PortalSection =
  "home" | "aboutus" | "contact" | "jobs" | "products" | "product";
export async function portalPageMetadata(
  params: Promise<{ domain: string; lang: string; id?: string }>,
  section: PortalSection,
) {
  const { domain, lang, id } = await params;
  const locale = isLocale(lang) ? lang : "zh";
  const data = await fetchTenantData(domain);
  const product =
    section === "product" && id
      ? await fetchProductById(domain, id)
      : undefined;
  const copy = foundationCopy(locale);
  const name = typeof data?.name === "string" ? data.name : copy.siteTitle;
  const label = product?.name || copy.portalMetadata[section];
  const suffix =
    section === "home"
      ? ""
      : section === "product"
        ? `/products/${encodeURIComponent(id || "")}`
        : `/${section}`;
  const path = (language: string) =>
    `/portal/${encodeURIComponent(domain)}/${language}${suffix}`;
  return buildMetadata({
    title: `${label} - ${name}`,
    description: typeof data?.intro === "string" ? data.intro : name,
    path: path(locale),
    locale,
    private: !data || (section === "product" && !product),
    alternates: { zh: path("zh"), en: path("en") },
  });
}
