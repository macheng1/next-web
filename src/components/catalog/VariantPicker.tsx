"use client";
import type {Product} from "@/src/lib/catalog/model";
import {Button} from "../Button";
import {CatalogImage} from "./CatalogImage";
/** Selecting a dimension always selects a real variant and updates its other dimensions. */
export function VariantPicker({product:p,selected,onChange}:{product:Product;selected:number;onChange:(index:number)=>void}) {
 const dimensions=p.dimensionNames||[];
 const current=p.variants[selected];
 return <div className="space-y-3">{dimensions.map((name,d)=>{
  const values=[...new Set(p.variants.map(v=>v.dimensionValues?.[d]).filter((v):v is string=>!!v))];
  return <div key={name} className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center"><h2 className="text-sm font-semibold">{name}</h2><div role="group" aria-label={name} className="flex flex-wrap gap-2">{values.map(value=>{
    const candidates=p.variants.map((v,i)=>({v,i})).filter(({v})=>v.dimensionValues?.[d]===value);
    const best=candidates.find(({v})=>dimensions.every((_,other)=>other===d||v.dimensionValues?.[other]===current?.dimensionValues?.[other]))||candidates[0];
    return <Button radius={6} key={value} variant={current?.dimensionValues?.[d]===value?"secondary":"outline"} aria-pressed={current?.dimensionValues?.[d]===value} onClick={()=>onChange(best.i)} className="h-auto! min-h-11 whitespace-normal!"><span className="flex items-center gap-2"><span className="relative h-8 w-8 shrink-0"><CatalogImage src={best.v.imageUrl||p.images[0]} alt="" compact/></span>{value}</span></Button>;
  })}</div></div>;
 })}</div>;
}
