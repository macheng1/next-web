import { EnterpriseApplication } from "@/src/components/EnterpriseApplication";
import { resolveLocale } from "@/src/lib/locale";
import { buildMetadata } from "@/src/lib/seo/metadata";
import zh from "@/src/dictionaries/zh.json";
import en from "@/src/dictionaries/en.json";
export async function generateMetadata() {
  const locale = await resolveLocale();
  const c = locale === "en" ? en.enterpriseOnboarding : zh.enterpriseOnboarding;
  return buildMetadata({
    title: c.title,
    description: c.intro,
    path: "/enterprise/apply",
    locale,
    private: true,
  });
}
export default async function EnterpriseApplyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Presentation only: this flag does not establish identity or grant permissions.
  return <EnterpriseApplication embedded={params.entry === "miniapp"} />;
}
