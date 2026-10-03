"use client";
import Image from "next/image";
import {useFoundation} from "../Providers";
export function BrandLogo({inverse=false}:{inverse?:boolean}){
 const {locale}=useFoundation();
 const src=inverse?`/brand/logo-${locale}-white.svg`:locale==='en'?'/brand/logo-en.svg':'/brand/logo-horizontal.svg';
 return <Image src={src} width={180} height={40} alt={locale==='en'?'ManuLink':'制造帮'} className="h-9 w-auto max-w-full object-contain"/>;
}
