import { PolicyDocument } from "@/src/components/auth/PolicyContents";
import { resolveLocale } from "@/src/lib/locale";
import { buildMetadata } from "@/src/lib/seo/metadata";
export async function generateMetadata() {
  const locale = await resolveLocale();
  return buildMetadata({title: locale === "zh" ? "隐私政策" : "Privacy policy", description: locale === "zh" ? "隐私政策" : "Privacy policy", path: "/privacy", locale});
}
export default function Page() { return <PolicyDocument kind="privacy" />; }
