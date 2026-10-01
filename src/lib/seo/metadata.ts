import type {Metadata} from 'next';
import type {Locale} from '../i18n/locale';
import {parseServerConfig} from '../config/schema';
export interface MetadataInput {title:string;description:string;path:string;locale:Locale;alternates?:Partial<Record<Locale,string>>;private?:boolean}
function absolute(site:string,path:string):string {
 if(!path.startsWith('/') || path.startsWith('//') || /[\\\x00-\x1f]/.test(path))throw new Error('Invalid metadata path');const url=new URL(path,site);if(url.origin!==site)throw new Error('Invalid metadata path');return url.href;
}
export function buildMetadata(input:MetadataInput):Metadata {
 const config=parseServerConfig(process.env);const canonical=absolute(config.siteUrl,input.path);const index=config.deploymentEnv==='production' && !input.private;
 const languages=input.alternates?Object.fromEntries(Object.entries(input.alternates).map(([lang,path])=>[lang,absolute(config.siteUrl,path!)])):undefined;
 return {title:input.title,description:input.description,metadataBase:new URL(config.siteUrl),alternates:{canonical,languages},robots:{index,follow:index},openGraph:{title:input.title,description:input.description,url:canonical,locale:input.locale==='zh'?'zh_CN':'en_US',type:'website'},twitter:{card:'summary',title:input.title,description:input.description}};
}
