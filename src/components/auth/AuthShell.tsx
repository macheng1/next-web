"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BrandLogo } from "../catalog/BrandLogo";
import { LanguageSelect } from "../catalog/LanguageSelect";
import { useFoundation } from "../Providers";
import type { PublishedPolicies } from "@/src/lib/catalog/model";
import { PolicyContents } from "./PolicyContents";
import { Modal } from "../Modal";
import { authCopy } from "@/src/lib/auth/copy";
import styles from "./auth.module.css";
export function AuthPolicyLinks({ policies }: { policies?: PublishedPolicies } = {}) {
  const { locale } = useFoundation();
  const t = authCopy(locale);
  const [policy, setPolicy] = useState<"terms" | "privacy" | null>(null);
  return (
    <>
      <button
        type="button"
        className={styles.textButton}
        onClick={() => setPolicy("terms")}
      >
        {t.terms}
      </button>{" "}
      {t.and}{" "}
      <button
        type="button"
        className={styles.textButton}
        onClick={() => setPolicy("privacy")}
      >
        {t.privacy}
      </button>
      <Modal
        open={policy !== null}
        onClose={() => setPolicy(null)}
        title={policy === "terms" ? t.terms : t.privacy}
        width={480}
      >
        {policy && <PolicyContents kind={policy} policies={policies} />}
        <Link href={policy === "terms" ? "/terms" : "/privacy"} target="_blank" rel="noopener noreferrer" className={styles.textButton}>{locale === "en" ? "Open full page →" : "打开完整页面 →"}</Link>
      </Modal>
    </>
  );
}
export function AuthShell({ children }: { children: ReactNode }) {
  const { locale } = useFoundation();
  const t = authCopy(locale);
  const steps = [
    [
      t.b1,
      t.d1,
      "M4 21V6l9-3v18M13 9h7v12M2 21h20M7 8h3M7 12h3M7 16h3M16 12h1M16 16h1",
    ],
    [t.b2, t.d2, "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"],
    [t.b3, t.d3, "M3 4h18v13H8l-5 4zM7 8h10M7 12h6"],
  ];
  return (
    <div className={styles.shell} data-locale={locale}>
      <header className={styles.header}>
        <Link href="/">
          <BrandLogo variant="auth" />
        </Link>
        <nav className={styles.nav}>
          <Link href="/">{t.backSite}</Link>
          <LanguageSelect compact />
        </nav>
      </header>
      <main className={styles.main}>
        <section className={styles.story}>
          <div className={styles.eyebrow}>{t.eyebrow}</div>
          <h1>
            {t.titleA}
            <span>{t.titleB}</span>
          </h1>
          <p>{t.lead}</p>
          <div className={styles.diagram}>
            <div className={styles.diagramTop}>
              <strong>{t.workflow}</strong>
              <span>ManuLink</span>
            </div>
            {steps.map(([title, detail, path], i) => (
              <div className={styles.diagramItem} key={title}>
                <span className={styles.symbol}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <path d={path} />
                  </svg>
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
                <span className={styles.step}>0{i + 1}</span>
              </div>
            ))}
          </div>

        </section>
        <section className={styles.formSide}>
          <div className={styles.form}>
            {children}

          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div>© ManuLink</div>
        <div>
          <AuthPolicyLinks />
        </div>
      </footer>
    </div>
  );
}
