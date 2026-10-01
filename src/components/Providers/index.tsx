"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { isLocale } from "@/src/lib/i18n/locale";
import { LocaleProvider } from "@douyinfe/semi-ui-19";
import zhCN from "@douyinfe/semi-ui-19/lib/es/locale/source/zh_CN";
import enUS from "@douyinfe/semi-ui-19/lib/es/locale/source/en_US";
import type { Locale } from "@/src/lib/i18n/locale";
import { foundationCopy } from "@/src/lib/i18n/foundation";
const LanguageContext = createContext<Locale>("zh");
export function useFoundation() {
  const locale = useContext(LanguageContext);
  return { locale, copy: foundationCopy(locale) };
}
export function Providers({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const preferred = useSyncExternalStore(
    (notify) => {
      window.addEventListener("languagechange", notify);
      return () => window.removeEventListener("languagechange", notify);
    },
    () => {
      const value = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)?.[1];
      return isLocale(value) ? value : locale;
    },
    () => locale,
  );
  const pathLocale = pathname?.match(/^\/portal\/[^/]+\/(zh|en)(?:\/|$)/)?.[1];
  const activeLocale = isLocale(pathLocale) ? pathLocale : preferred;
  useEffect(() => {
    document.documentElement.lang = activeLocale;
  }, [activeLocale]);
  return (
    <LanguageContext.Provider value={activeLocale}>
      <LocaleProvider locale={activeLocale === "en" ? enUS : zhCN}>
        {children}
      </LocaleProvider>
    </LanguageContext.Provider>
  );
}
