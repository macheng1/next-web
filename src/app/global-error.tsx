"use client";
import { useSyncExternalStore } from "react";
import { StatusState } from "@/src/components/StatusState";
import { Providers } from "@/src/components/Providers";
import { resolveLanguage, type Locale } from "@/src/lib/i18n/locale";
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useSyncExternalStore(
    subscribe,
    browserLocale,
    () => "zh" as Locale,
  );
  return (
    <html lang={locale}>
      <body>
        <Providers locale={locale}>
          <StatusState kind="error" locale={locale} onRetry={reset} />
        </Providers>
      </body>
    </html>
  );
}

function subscribe(callback: () => void) {
  window.addEventListener("languagechange", callback);
  return () => window.removeEventListener("languagechange", callback);
}
function browserLocale(): Locale {
  const parts = location.pathname.split("/");
  return resolveLanguage({
    pathLocale: parts[1] === "portal" ? parts[3] : undefined,
    cookieLocale: document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)?.[1],
    acceptLanguage: navigator.language,
  });
}
