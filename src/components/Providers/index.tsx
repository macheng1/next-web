"use client";
import { createContext, useContext, type ReactNode } from "react";
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
  return (
    <LanguageContext.Provider value={locale}>
      <LocaleProvider locale={locale === "en" ? enUS : zhCN}>
        {children}
      </LocaleProvider>
    </LanguageContext.Provider>
  );
}
