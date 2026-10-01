import { SecurityError } from './origin';
export interface UploadPolicy {maxBytes:number;maxCount:number;types:readonly string[]}
export const DEFAULT_UPLOAD_POLICY:UploadPolicy={maxBytes:10*1024*1024,maxCount:5,types:['image/jpeg','image/png','image/webp','application/pdf']};
export const INQUIRY_UPLOAD_POLICY:UploadPolicy={maxBytes:5*1024*1024,maxCount:6,types:[...DEFAULT_UPLOAD_POLICY.types,'image/gif','application/zip','application/x-zip-compressed','application/dwg','application/octet-stream']};
export async function validateUpload(file:File,policy:UploadPolicy):Promise<void> {
 if(file.size===0 || file.size>policy.maxBytes) throw new SecurityError(400,'upload_size');
 if(!policy.types.includes(file.type) || /[\x00-\x1f/\\]/.test(file.name) || file.name.length>255)throw new SecurityError(400,'upload_type');
 const b=new Uint8Array(await file.slice(0,16).arrayBuffer());const ascii=new TextDecoder().decode(b);const ext=file.name.split('.').pop()?.toLowerCase();
 const matches=(v:number[])=>v.every((n,i)=>b[i]===n);
 let valid=false;
 if(['jpg','jpeg'].includes(ext||'')) valid=file.type==='image/jpeg' && matches([255,216,255]);
 if(ext==='png') valid=file.type==='image/png' && matches([137,80,78,71,13,10,26,10]);
 if(ext==='webp') valid=file.type==='image/webp' && ascii.startsWith('RIFF') && ascii.slice(8,12)==='WEBP';
 if(ext==='pdf') valid=file.type==='application/pdf' && ascii.startsWith('%PDF-');
 if(ext==='gif') valid=file.type==='image/gif' && /^(GIF87a|GIF89a)/.test(ascii);
 if(ext==='zip') valid=['application/zip','application/x-zip-compressed','application/octet-stream'].includes(file.type) && (matches([80,75,3,4]) || matches([80,75,5,6]));
 if(ext==='dwg') valid=['application/dwg','application/octet-stream'].includes(file.type) && /^AC10\d{2}/.test(ascii);
 if(!valid)throw new SecurityError(400,'upload_type');
}
