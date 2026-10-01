export function validateExternalUrl(value:string,allowedHosts?:readonly string[]):URL {
 const url=new URL(value);if(!['http:','https:'].includes(url.protocol) || url.username || url.password || (allowedHosts && !allowedHosts.includes(url.hostname))) throw new Error('Unsafe URL');return url;
}
export function safeExternalUrl(value:string):string|undefined {try{return validateExternalUrl(value).href;}catch{return undefined;}}
