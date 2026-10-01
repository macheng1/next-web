"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Select, Checkbox } from "@douyinfe/semi-ui-19";
import { IconShield, IconTickCircle } from "@douyinfe/semi-icons";
import { Button } from "@/src/components/Button";
import { Field, FieldShell, useFieldA11y } from "@/src/components/Field";
import { Uploader } from "@/src/components/Uploader";
import { useFoundation } from "@/src/components/Providers";
import { uploadWebFile, type UploadedFile } from "@/src/lib/upload-api";
import {
  emptyEnterprise,
  normalizeEnterprise,
  validateEnterpriseDetails,
  parseEnterpriseDraft,
  DRAFT_KEY,
  type EnterpriseValues,
  type EnterpriseErrors,
  type EnterpriseOptions,
  type EnterpriseReceipt,
} from "@/src/lib/enterprise-onboarding/model";
import {
  getEnterpriseOptions,
  sendEnterpriseSms,
  submitEnterpriseApplication,
} from "@/src/lib/enterprise-onboarding/api";
import zh from "@/src/dictionaries/zh.json";
import en from "@/src/dictionaries/en.json";
function Choice({
  id,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const a = useFieldA11y();
  return (
    <Select
      id={id}
      aria-label={id}
      aria-describedby={a.describedBy}
      aria-invalid={a.invalid}
      aria-required={a.required}
      value={value || undefined}
      optionList={options}
      placeholder={placeholder}
      onChange={(v) => onChange(String(v))}
      style={{ width: "100%" }}
      size="large"
    />
  );
}
export function EnterpriseApplication({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { locale, copy: foundation } = useFoundation();
  const c = locale === "en" ? en.enterpriseOnboarding : zh.enterpriseOnboarding;
  const [step, setStep] = useState(0),
    [values, setValues] = useState<EnterpriseValues>({ ...emptyEnterprise });
  const [errors, setErrors] = useState<EnterpriseErrors>({}),
    [file, setFile] = useState<UploadedFile | null>(null);
  const [options, setOptions] = useState<EnterpriseOptions | null>(null),
    [optionsError, setOptionsError] = useState(false),
    [reload, setReload] = useState(0);
  const [uploading, setUploading] = useState(false),
    [busy, setBusy] = useState(false),
    [sending, setSending] = useState(false);
  const [smsCode, setSmsCode] = useState(""),
    [seconds, setSeconds] = useState(0),
    [agreed, setAgreed] = useState(false);
  const [alert, setAlert] = useState(""),
    [notice, setNotice] = useState(""),
    [receipt, setReceipt] = useState<EnterpriseReceipt | null>(null);
  const [draft, setDraft] =
    useState<ReturnType<typeof parseEnterpriseDraft>>(null);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const submissionLock = useRef(false),
    smsLock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    getEnterpriseOptions(controller.signal)
      .then((v) => {
        setOptions(v);
        setOptionsError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptionsError(true);
      });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    try {
      const saved = parseEnterpriseDraft(localStorage.getItem(DRAFT_KEY));
      if (saved) setDraft(saved);
    } catch {}
  }, []);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  function update(key: keyof EnterpriseValues, value: string) {
    setValues((v) => ({
      ...v,
      [key]: key === "creditCode" ? value.toUpperCase() : value,
    }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setAlert("");
    if (key === "contactPhone") {
      setSmsCode("");
      setSeconds(0);
    }
  }
  function advance(to: number) {
    setStep(to);
    setAlert("");
    setNotice("");
    setTimeout(() => heading.current?.focus(), 0);
  }
  function next() {
    if (step === 0) {
      const normalized = normalizeEnterprise(values);
      const e = validateEnterpriseDetails(normalized);
      if (
        options &&
        !options.industries.some((o) => o.code === values.industryCode)
      )
        e.industryCode = "required";
      if (options && !options.scales.some((o) => o.code === values.scaleCode))
        e.scaleCode = "required";
      setErrors(e);
      if (Object.keys(e).length) {
        setAlert(c.checkFields);
        document.getElementById(Object.keys(e)[0])?.focus();
        return;
      }
      setValues(normalized);
    }
    if (step === 1 && !file) {
      setAlert(c.licenseRequired);
      return;
    }
    advance(step + 1);
  }
  function save() {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ version: 1, values, file }),
      );
      setDraft(null);
      setNotice(c.saved);
    } catch {
      setAlert(c.storageError);
    }
  }
  function discard() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setDraft(null);
      setNotice("");
    } catch {
      setAlert(c.storageError);
    }
  }
  async function send() {
    if (smsLock.current || seconds > 0) return;
    smsLock.current = true;
    setSending(true);
    setAlert("");
    try {
      await sendEnterpriseSms(values.contactPhone);
      setSeconds(60);
      setNotice(c.codeSent);
    } catch (e) {
      setAlert(e instanceof Error ? e.message : foundation.error);
    } finally {
      smsLock.current = false;
      setSending(false);
    }
  }
  async function submit() {
    if (submissionLock.current) return;
    if (!file) {
      setAlert(c.licenseRequired);
      return;
    }
    if (!/^\d{6}$/.test(smsCode)) {
      setAlert(c.codeRequired);
      return;
    }
    if (!agreed) {
      setAlert(c.agreementRequired);
      return;
    }
    submissionLock.current = true;
    setBusy(true);
    setAlert("");
    try {
      const normalized = normalizeEnterprise(values);
      const fingerprint = JSON.stringify({
        ...normalized,
        businessLicenseUrl: file.url,
      });
      if (request.current?.fingerprint !== fingerprint)
        request.current = { fingerprint, id: crypto.randomUUID() };
      const result = await submitEnterpriseApplication({
        ...normalized,
        requestId: request.current.id,
        countryCode: "CN",
        businessLicenseUrl: file.url,
        smsCode,
        agreementAccepted: true,
      });
      setReceipt(result);
      setNotice("");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setSmsCode("");
      setTimeout(() => heading.current?.focus(), 0);
    } catch (e) {
      setAlert(e instanceof Error ? e.message : foundation.error);
    } finally {
      submissionLock.current = false;
      setBusy(false);
    }
  }
  function field(
    key: keyof EnterpriseValues,
    required = false,
    multiline = false,
  ) {
    return (
      <Field
        key={key}
        id={key}
        label={c.labels[key]}
        required={required}
        value={values[key]}
        error={errors[key] ? c.validation[errors[key]!] : undefined}
        onValueChange={(v) => update(key, v)}
        multiline={multiline}
        maxLength={
          {
            companyName: 256,
            companyShortName: 128,
            creditCode: 18,
            contactName: 64,
            contactPhone: 11,
            email: 254,
            registeredAddress: 500,
            legalPerson: 64,
            description: 2000,
            cityName: 64,
            industryCode: 32,
            scaleCode: 16,
          }[key]
        }
        inputMode={
          key === "contactPhone" ? "tel" : key === "email" ? "email" : "text"
        }
        autoComplete={
          key === "email"
            ? "email"
            : key === "contactPhone"
              ? "tel"
              : key === "companyName"
                ? "organization"
                : "off"
        }
      />
    );
  }
  function choice(key: "industryCode" | "scaleCode") {
    const items =
      key === "industryCode" ? options?.industries : options?.scales;
    const translated: Record<string, string> =
      key === "industryCode" ? c.industries : c.scales;
    return (
      <FieldShell
        id={key}
        label={c.labels[key]}
        required
        error={errors[key] ? c.validation[errors[key]!] : undefined}
      >
        <Choice
          id={key}
          value={values[key]}
          options={(items ?? []).map((o) => ({
            value: o.code,
            label: translated[o.code] ?? o.name,
          }))}
          placeholder={c.select}
          onChange={(v) => update(key, v)}
        />
      </FieldShell>
    );
  }
  return (
    <div
      className="min-h-dvh bg-[var(--paper)] text-[var(--ink-800)]"
      data-embedded={embedded}
    >
      <header className="flex h-16 items-center gap-3 border-b border-[var(--ink-100)] bg-[var(--surface)] px-4 sm:h-[76px] sm:gap-6 sm:px-6 lg:px-[max(24px,calc((100vw-1120px)/2))] [&_img]:h-auto [&_img]:w-28 sm:[&_img]:w-[140px]">
        {embedded ? (
          <Image
            src="/brand/logo-horizontal.svg"
            alt="制造帮"
            width={140}
            height={42}
            priority
          />
        ) : (
          <Link href="/" aria-label={c.home}>
            <Image
              src="/brand/logo-horizontal.svg"
              alt="制造帮"
              width={140}
              height={42}
              priority
            />
          </Link>
        )}
        {!embedded && (
          <nav
            className="ml-auto text-xs text-[var(--ink-600)] sm:text-sm"
            aria-label={c.home}
          >
            <Link href="/">{c.home}</Link>
          </nav>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            document.cookie = `NEXT_LOCALE=${locale === "zh" ? "en" : "zh"}; Path=/; SameSite=Lax`;
            window.dispatchEvent(new Event("languagechange"));
          }}
          disabled={busy || uploading}
        >
          {locale === "zh" ? "English" : "中文"}
        </Button>
      </header>
      <div className="min-h-[calc(100dvh-64px)] sm:min-h-[calc(100dvh-76px)]">
        <main className="mx-auto w-full min-w-0 max-w-[920px] px-4 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:px-8 lg:pt-12 lg:pb-8">
          <div className="mb-6 text-left sm:mb-9 sm:text-center [&_h1]:mb-2.5 [&_h1]:text-[26px] [&_h1]:leading-snug [&_h1]:font-bold sm:[&_h1]:text-3xl [&_p]:mt-3 [&_p]:max-w-[600px] [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-[var(--ink-500)] sm:[&_p]:mx-auto">
            <h1>{c.title}</h1>
            <p>{c.intro}</p>
          </div>
          {!receipt && (
            <ol
              className="mb-6 flex list-none gap-2 p-0 sm:mb-7 sm:gap-6 sm:px-6 [&_li]:flex [&_li]:min-w-0 [&_li]:flex-1 [&_li]:flex-col [&_li]:items-start [&_li]:gap-2 [&_li]:text-xs [&_li]:text-[var(--ink-500)] sm:[&_li]:flex-row sm:[&_li]:items-center sm:[&_li]:gap-2.5 sm:[&_li]:text-sm [&_li>span]:grid [&_li>span]:size-8 [&_li>span]:shrink-0 [&_li>span]:place-items-center [&_li>span]:rounded-full [&_li>span]:border [&_li>span]:border-[var(--ink-200)] [&_li>span]:bg-[var(--surface)] [&_li[data-active=true]]:font-semibold [&_li[data-active=true]]:text-[var(--jade-800)] [&_li[data-active=true]>span]:border-[var(--jade-700)] [&_li[data-active=true]>span]:bg-[var(--jade-700)] [&_li[data-active=true]>span]:text-white [&_li[data-done=true]>span]:border-[var(--jade-200)] [&_li[data-done=true]>span]:text-[var(--jade-700)]"
              aria-label={c.title}
            >
              {c.steps.map((s, i) => (
                <li
                  key={s}
                  aria-current={step === i ? "step" : undefined}
                  data-active={step === i}
                  data-done={step > i}
                >
                  <span>{step > i ? <IconTickCircle /> : i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          )}
          <section
            className="rounded-2xl border border-[var(--ink-100)] bg-[var(--surface)] px-4 py-5 shadow-sm sm:p-6 lg:p-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold"
            aria-busy={busy}
          >
            <h2 ref={heading} tabIndex={-1}>
              {receipt
                ? c.submitted
                : step === 0
                  ? c.details
                  : step === 1
                    ? c.license
                    : c.review}
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-[var(--ink-500)] sm:mb-6">
              {receipt
                ? c.submittedHint
                : step === 0
                  ? c.detailsHint
                  : step === 1
                    ? c.licenseHint
                    : c.reviewHint}
            </p>
            {alert && (
              <div
                role="alert"
                className="mb-5 rounded-lg bg-[var(--error-bg)] p-3.5 text-sm text-[var(--error)]"
              >
                {alert}
              </div>
            )}
            {notice && (
              <p
                role="status"
                className="mb-5 rounded-lg bg-[var(--jade-50)] p-3.5 text-[13px] text-[var(--jade-800)]"
              >
                {notice}
              </p>
            )}
            {receipt ? (
              <div className="py-6 text-[var(--jade-700)] [&_dl]:my-6 [&_dl]:text-sm [&_dl]:leading-relaxed [&_dd]:mt-2 [&_dd]:mb-5 [&_dd]:[overflow-wrap:anywhere] [&_dd]:text-[var(--ink-800)]">
                <IconTickCircle size="extra-large" />
                <dl>
                  <dt>{c.applicationId}</dt>
                  <dd>{receipt.applicationId}</dd>
                  <dt>{c.status}</dt>
                  <dd>{c[receipt.status]}</dd>
                </dl>
                {!embedded && (
                  <Link
                    href="/"
                    className="inline-block rounded-lg bg-[var(--jade-700)] px-6 py-3 text-sm text-white"
                  >
                    {c.home}
                  </Link>
                )}
              </div>
            ) : (
              <>
                {draft && step === 0 && (
                  <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--jade-200)] p-3 text-[13px] [&>span]:basis-full sm:[&>span]:basis-auto sm:[&>span]:flex-1">
                    <span>{c.draftFound}</span>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setValues(draft.values);
                        setFile(draft.file);
                        setDraft(null);
                        setErrors({});
                        setAlert("");
                      }}
                    >
                      {c.restore}
                    </Button>
                    <Button variant="ghost" onClick={discard}>
                      {c.discard}
                    </Button>
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (step < 2) next();
                    else void submit();
                  }}
                  noValidate
                >
                  {step === 0 && (
                    <>
                      <div className="mb-5 rounded-lg border border-[var(--jade-100)] bg-[var(--jade-50)] p-3 text-[13px] sm:mb-6 sm:p-4 [&_p]:mt-1.5 [&_p]:leading-relaxed [&_p]:text-[var(--ink-500)]">
                        <strong>
                          {c.country}: {c.countryName}
                        </strong>
                        <p>{c.scope}</p>
                      </div>
                      {optionsError && (
                        <div
                          role="alert"
                          className="mb-5 rounded-lg bg-[var(--error-bg)] p-3.5 text-sm text-[var(--error)]"
                        >
                          {c.optionsError}{" "}
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setOptionsError(false);
                              setReload((r) => r + 1);
                            }}
                          >
                            {c.retry}
                          </Button>
                        </div>
                      )}
                      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                        {field("companyName", true)}
                        {field("companyShortName")}
                        {field("creditCode", true)}
                        {field("cityName")}
                        {choice("industryCode")}
                        {choice("scaleCode")}
                        <div className="col-span-full min-w-0">
                          {field("registeredAddress", true)}
                        </div>
                        {field("legalPerson")}
                        <div className="col-span-full min-w-0">
                          {field("description", false, true)}
                        </div>
                      </div>
                      <h3 className="mt-6 mb-4 border-t border-[var(--ink-100)] pt-5 text-base font-semibold sm:pt-6">
                        {c.contact}
                      </h3>
                      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                        {field("contactName", true)}
                        {field("contactPhone", true)}
                        <div className="col-span-full min-w-0">
                          {field("email", true)}
                        </div>
                      </div>
                    </>
                  )}
                  {step === 1 && (
                    <Uploader
                      id="license"
                      required
                      label={c.license}
                      value={file}
                      upload={(f) =>
                        uploadWebFile(f, {
                          module: "enterprise-license",
                          fallbackMessage: c.uploadError,
                        })
                      }
                      onChange={(f) => {
                        setFile(f);
                        setAlert("");
                      }}
                      onUploadingChange={setUploading}
                      actionText={c.upload}
                      constraintText={c.formats}
                      uploadingText={c.uploading}
                      doneText={c.uploaded}
                      removeText={c.remove}
                      previewText={c.preview}
                      previewTitle={c.license}
                      closeText={c.close}
                      failedText={c.uploadError}
                    />
                  )}
                  {step === 2 && (
                    <>
                      <dl className="mb-7 [&>div]:grid [&>div]:grid-cols-1 [&>div]:gap-1 [&>div]:border-b [&>div]:border-[var(--ink-100)] [&>div]:py-3 [&>div]:text-sm sm:[&>div]:grid-cols-[180px_minmax(0,1fr)] sm:[&>div]:gap-4 [&_dt]:text-[var(--ink-500)] [&_dd]:m-0 [&_dd]:[overflow-wrap:anywhere] [&_dd]:whitespace-pre-wrap">
                        {(Object.keys(values) as (keyof EnterpriseValues)[])
                          .filter((k) => values[k])
                          .map((k) => (
                            <div key={k}>
                              <dt>{c.labels[k]}</dt>
                              <dd>
                                {k === "industryCode"
                                  ? ((c.industries as Record<string, string>)[
                                      values[k]
                                    ] ??
                                    options?.industries.find(
                                      (o) => o.code === values[k],
                                    )?.name)
                                  : k === "scaleCode"
                                    ? ((c.scales as Record<string, string>)[
                                        values[k]
                                      ] ??
                                      options?.scales.find(
                                        (o) => o.code === values[k],
                                      )?.name)
                                    : values[k]}
                              </dd>
                            </div>
                          ))}
                        <div>
                          <dt>{c.license}</dt>
                          <dd>{file?.originalName}</dd>
                        </div>
                      </dl>
                      <div className="mb-6 flex items-end gap-2 sm:gap-3 [&>div]:min-w-0 [&>div]:flex-1 [&>button]:shrink-0 [&>button]:px-3!">
                        <Field
                          id="smsCode"
                          label={c.code}
                          required
                          value={smsCode}
                          onValueChange={(v) =>
                            setSmsCode(v.replace(/\D/g, "").slice(0, 6))
                          }
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                        />
                        <Button
                          variant="outline"
                          disabled={sending || seconds > 0 || busy}
                          onClick={() => void send()}
                        >
                          {seconds > 0 ? `${seconds}s` : c.sendCode}
                        </Button>
                      </div>
                      <Checkbox
                        checked={agreed}
                        disabled={busy}
                        onChange={(e) => setAgreed(Boolean(e.target.checked))}
                      >
                        {c.agreement}
                      </Checkbox>
                    </>
                  )}
                  <div className="mt-6 flex items-center justify-between gap-2 border-t border-[var(--ink-100)] pt-4 sm:mt-8 sm:gap-3 sm:pt-6 [&>button]:shrink-0 [&>button]:px-2! sm:[&>button]:px-5! [&>div]:flex [&>div]:min-w-0 [&>div]:flex-1 [&>div]:justify-end [&>div]:gap-2 sm:[&>div]:gap-3 [&>div>button]:min-w-0! [&>div>button]:whitespace-normal! [&>div>button]:px-3! sm:[&>div>button]:px-5!">
                    <Button
                      variant="ghost"
                      onClick={save}
                      disabled={busy || uploading}
                    >
                      {c.save}
                    </Button>
                    <div>
                      {step > 0 && (
                        <Button
                          variant="outline"
                          disabled={busy || uploading}
                          onClick={() => advance(step - 1)}
                        >
                          {c.back}
                        </Button>
                      )}
                      <Button
                        htmlType="submit"
                        disabled={busy || uploading || (step === 0 && !options)}
                        loading={busy}
                      >
                        {step < 2 ? c.next : busy ? c.submitting : c.submit}
                      </Button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </section>
          {!receipt && (
            <section
              className="mt-5 border-b border-[var(--ink-200)] py-4 sm:mt-7 sm:py-6 [&_h2]:mb-3 [&_h2]:text-sm [&_h2]:font-semibold [&_ol]:m-0 [&_ol]:grid [&_ol]:list-none [&_ol]:grid-cols-1 [&_ol]:gap-2 [&_ol]:p-0 sm:[&_ol]:grid-cols-3 sm:[&_ol]:gap-5 [&_li]:flex [&_li]:gap-2.5 [&_li]:text-[13px] [&_li]:leading-relaxed [&_li]:text-[var(--ink-500)] [&_li>span]:font-semibold [&_li>span]:text-[var(--jade-700)]"
              aria-labelledby="application-guidance"
            >
              <h2 id="application-guidance">{c.noteTitle}</h2>
              <ol>
                {c.notes.map((note, index) => (
                  <li key={note}>
                    <span>{index + 1}</span>
                    {note}
                  </li>
                ))}
              </ol>
            </section>
          )}
          <p className="mt-4 flex gap-2 text-xs leading-relaxed text-[var(--ink-500)] [&>span]:mt-1 [&>span]:shrink-0">
            <IconShield /> {c.privacy}
          </p>
        </main>
      </div>
    </div>
  );
}
