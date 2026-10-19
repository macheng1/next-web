import { PolicyDocument } from "@/src/components/auth/PolicyContents";
import { resolveLocale } from "@/src/lib/locale";
import { buildMetadata } from "@/src/lib/seo/metadata";
export async function generateMetadata() {
  const locale = await resolveLocale();
  return buildMetadata({title: locale === "zh" ? "用户协议" : "Terms of Service", description: locale === "zh" ? "用户协议" : "Terms of Service", path: "/terms", locale});
}
export default function Page() { return <PolicyDocument kind="terms" />; }
