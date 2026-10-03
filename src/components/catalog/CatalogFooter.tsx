"use client";
import Link from "next/link";
import {useFoundation} from "../Providers";
import {catalogCopy} from "@/src/lib/catalog/copy";
import type {CatalogFooterData} from "@/src/lib/catalog/model";
import {useCatalog} from "@/src/lib/catalog/use-catalog";
import {BrandLogo} from "./BrandLogo";
import {SocialLinks} from "./SocialLinks";
import {LanguageSelect} from "./LanguageSelect";
function safeHref(href:string){if(/[\\\s]/.test(href))return false;if(href.startsWith('/'))return !href.startsWith('//');try{const u=new URL(href);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export function CatalogFooter(){
 const {locale}=useFoundation();const t=catalogCopy(locale);const {data}=useCatalog<CatalogFooterData>('footer');
 const groups=data?.groups??[{title:t.footerExplore,links:[{label:t.home,href:'/'},{label:t.products,href:'/products'},{label:t.suppliers,href:'/suppliers'}]},{title:t.footerEnterprise,links:[{label:t.join,href:'/enterprise/apply'}]},{title:locale==='en'?'Platform':'平台信息',links:[]}];
 const company=data?.companyName||(locale==='en'?'Wuxi Yuansi Technology Co., Ltd.':'无锡元思科技有限公司');
 return <footer className="mt-16 bg-[#102e2a] text-white"><div className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 lg:px-8">
 <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] lg:gap-10">
 <div className="min-w-0 sm:col-span-2 lg:col-span-1"><Link href="/" aria-label={t.home}><BrandLogo inverse/></Link><p className="mt-4 text-sm font-semibold">{data?.tagline||t.footer}</p><p className="mt-3 max-w-sm text-sm leading-7 text-white/70">{data?.description||t.footerAbout}</p><SocialLinks links={data?.socialLinks} pending={t.comingSoon}/></div>
 {groups.map((g,i)=><nav key={i} aria-label={g.title} className="min-w-0"><h2 className="mb-3 text-base font-semibold">{g.title}</h2><ul>{g.links.filter(l=>safeHref(l.href)).map((l,j)=><li key={j}><Link href={l.href} target={l.href.startsWith('https:')?'_blank':undefined} rel={l.href.startsWith('https:')?'noopener noreferrer':undefined} className="inline-flex min-h-11 items-center text-sm break-words text-white/75 hover:text-jade-200 hover:underline underline-offset-4">{l.label}</Link></li>)}</ul>{!g.links.length&&<p className="text-xs text-white/50">{t.comingSoon}</p>}</nav>)}
 </div><div className="mt-8 flex flex-col gap-4 border-t border-white/20 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-6 text-white/70">© {data?.year??2026} {company}</p><div className="w-fit rounded-md bg-white text-ink-900"><LanguageSelect/></div></div>
 </div></footer>;
}
