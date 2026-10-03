import "server-only";
import { resolveLocale } from "../locale";
import { buildMetadata } from "../seo/metadata";
import { catalogCopy } from "./copy";
export async function catalogMetadata(
  key: "products" | "suppliers",
  path: string,
) {
  const locale = await resolveLocale();
  const t = catalogCopy(locale);
  return buildMetadata({
    title: `${t[key]} · ${locale === "en" ? "ManuLink" : "制造帮"}`,
    description: t.heroDescription,
    path,
    locale,
  });
}
