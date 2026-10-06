"use client";
import { useSyncExternalStore } from "react";
import { IconShield } from "@douyinfe/semi-icons";
import { Button } from "../Button";
import { useFoundation } from "../Providers";
import { COOKIE_CONSENT_EVENT, getCookieChoice, saveCookieChoice, type CookieChoice } from "@/src/lib/cookie-consent";

export function cookieCopy(locale: "zh" | "en") {
  return locale === "zh" ? {
    title: "您的隐私，由您决定",
    description: "我们目前仅使用网站正常运行所需的 Cookie，用于登录、安全和语言偏好。可选 Cookie 默认关闭，仅在您同意后启用。",
    accept: "全部接受", reject: "仅必要 Cookie", policy: "Cookie 政策",
  } : {
    title: "Your privacy, your choice",
    description: "We currently use only cookies needed for sign-in, security and language preferences. Optional cookies remain off unless you accept them.",
    accept: "Accept all", reject: "Necessary only", policy: "Cookie policy",
  };
}
function subscribe(notify: () => void) {
  window.addEventListener(COOKIE_CONSENT_EVENT, notify);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, notify);
}
export function CookieConsent() {
  const { locale } = useFoundation();
  const t = cookieCopy(locale);
  const choice = useSyncExternalStore(subscribe, getCookieChoice, () => undefined);
  if (choice !== null) return null;
  function select(value: CookieChoice) {
    saveCookieChoice(value);
  }
  return (
    <section aria-label={t.title} data-testid="cookie-consent" translate="no"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-jade-200 bg-white px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-4px_28px_rgba(16,46,42,0.12)] sm:inset-x-5 sm:bottom-5 sm:mx-auto sm:max-w-6xl sm:rounded-xl sm:border sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex min-w-0 flex-1 gap-3">
          <IconShield aria-hidden className="mt-1 shrink-0 text-jade-700" size="extra-large" />
          <div className="min-w-0"><h2 className="text-base font-semibold text-ink-900">{t.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-700">{t.description}</p>
            <a href="/cookies" className="mt-2 inline-flex min-h-8 items-center text-sm text-jade-700 underline underline-offset-4">{t.policy}</a>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[320px] lg:shrink-0">
          <Button htmlType="button" variant="outline" radius={6} onClick={() => select("necessary")}>{t.reject}</Button>
          <Button htmlType="button" variant="outline" radius={6} onClick={() => select("all")}>{t.accept}</Button>
        </div>
      </div>
    </section>
  );
}
