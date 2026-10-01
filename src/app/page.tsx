import { foundationCopy } from "@/src/lib/i18n/foundation";
import { resolveLocale } from "@/src/lib/locale";
import Link from "next/link";
import { StatusState } from "@/src/components/StatusState";
export default async function HomePage() {
  const locale = await resolveLocale();
  const copy = foundationCopy(locale);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-5 py-16">
      <h1 className="font-display text-h1 text-jade-900">{copy.siteTitle}</h1>
      <p className="mt-4 text-body text-ink-600">{copy.siteDescription}</p>
      <StatusState kind="empty" locale={locale} />
      <Link
        className="mt-6 rounded-lg bg-jade-700 px-6 py-3 text-white"
        href="/enterprise/apply"
      >
        {locale === "en" ? "Enterprise onboarding" : "企业入驻"}
      </Link>
    </main>
  );
}
