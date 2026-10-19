"use client";
import { PublicBuyerNav } from "../buyer/PublicBuyerNav";
import {BrandLogo} from "./BrandLogo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IconMenu, IconClose } from "@douyinfe/semi-icons";
import { Button } from "../Button";
import { useFoundation } from "../Providers";
import { checkSession } from "@/src/lib/auth-api";
import { authCopy } from "@/src/lib/auth/copy";
import { catalogCopy } from "@/src/lib/catalog/copy";
import { LanguageSelect } from "./LanguageSelect";
import { CatalogFooter } from "./CatalogFooter";
export const linkButton =
  "inline-flex min-h-11 items-center justify-center rounded-[6px] border border-jade-200 px-4 py-2 text-sm font-semibold text-jade-700 hover:bg-jade-50";
export function CatalogShell({ children }: { children: ReactNode }) {
  const { locale } = useFoundation();
  const t = catalogCopy(locale);
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {let active=true;void checkSession().then((session) => {if(active && session.status!=="unavailable")setSignedIn(session.status==="authenticated");}).catch(() => {});return () => {active=false;};}, [path]);
  const authLabel=signedIn ? authCopy(locale).accountTitle : t.signIn;
  const links = [
    ["/products", t.products],
    ["/suppliers", t.suppliers],
    ["/#how", locale==="en"?"How it works":"使用流程"],
  ];
  return (
    <div className="flex min-h-dvh flex-col bg-white text-ink-900">
      <header className="shrink-0 border-b border-ink-100 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" aria-label={t.home}>
            <BrandLogo />
          </Link>
          <nav
            aria-label={t.menu}
            className="hidden items-center gap-5 lg:flex"
          >
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={path.startsWith(href) ? "page" : undefined}
                className={`py-2 text-sm font-semibold ${path.startsWith(href) ? "text-jade-700 underline underline-offset-8" : "text-ink-700"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <LanguageSelect />


            <span className="hidden lg:block">{signedIn?<PublicBuyerNav/>:<Link href="/login" className="text-sm font-semibold text-jade-700">{authLabel}</Link>}</span>
            <Button
              radius={6}
              variant="ghost"
              aria-label={t.menu}
              aria-expanded={open}
              aria-controls="catalog-mobile-menu"
              className="lg:hidden!"
              icon={open ? <IconClose /> : <IconMenu />}
              onClick={() => setOpen(!open)}
            />
          </div>
          {open && (
            <nav
              id="catalog-mobile-menu"
              aria-label={t.menu}
              className="flex w-full flex-col border-t border-ink-100 pt-2 lg:hidden"
            >
              {links.map(
                ([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="py-3 font-semibold"
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                ),
              )}
              <div className="flex flex-wrap gap-2 py-3">

                <Link href={signedIn?"/buyer":"/login"} className="py-2 font-semibold text-jade-700" onClick={() => setOpen(false)}>{authLabel}</Link>
              </div>
            </nav>
          )}
        </div>
      </header>
      <div className="min-w-0 flex-1">{children}</div>
      <CatalogFooter />
    </div>
  );
}
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      {children}
    </main>
  );
}
