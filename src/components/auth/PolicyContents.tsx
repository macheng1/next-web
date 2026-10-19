"use client";
import { useCatalog } from "@/src/lib/catalog/use-catalog";
import type { PublishedPolicies } from "@/src/lib/catalog/model";
import { useFoundation } from "../Providers";
import { CatalogState } from "../catalog/CatalogState";
import { CatalogShell, PageContainer } from "../catalog/CatalogShell";
function LoadedPolicy({kind, data}: {kind: "terms" | "privacy"; data: PublishedPolicies}) {
  const {locale} = useFoundation();
  const text = data[kind];
  return <article className="text-ink-700">
    <h1 className="mb-6 text-2xl font-semibold text-ink-900">{text.title}</h1>
    <p className="mb-6 text-xs text-ink-500">{locale === "en" ? "Version" : "版本"}：{data.version}</p>
    {text.format === "html" ? <div className="policy-rich-text break-words text-sm leading-7" dangerouslySetInnerHTML={{__html: text.body}} /> : <div className="whitespace-pre-wrap break-words text-sm leading-7">{text.body}</div>}
  </article>;
}
function RemotePolicy({kind}: {kind: "terms" | "privacy"}) {
  const result = useCatalog<PublishedPolicies>("policies");
  return <><CatalogState loading={result.loading} error={result.error} retry={result.retry} />{result.data && <LoadedPolicy kind={kind} data={result.data}/>}</>;
}
export function PolicyContents({kind, policies}: {kind: "terms" | "privacy"; policies?: PublishedPolicies}) {
  return policies ? <LoadedPolicy kind={kind} data={policies}/> : <RemotePolicy kind={kind}/>;
}
export function PolicyDocument({kind}: {kind: "terms" | "privacy"}) {
  return <CatalogShell><PageContainer><div className="mx-auto max-w-3xl"><RemotePolicy kind={kind}/></div></PageContainer></CatalogShell>;
}
