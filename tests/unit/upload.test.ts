import {it,expect} from 'vitest';
import {validateUpload,DEFAULT_UPLOAD_POLICY} from '../../src/lib/security/upload';
it('rejects forged image contents and empty files',async()=>{
 await expect(validateUpload(new File(['text'],'photo.png',{type:'image/png'}),DEFAULT_UPLOAD_POLICY)).rejects.toThrow();
 await expect(validateUpload(new File([],'photo.png',{type:'image/png'}),DEFAULT_UPLOAD_POLICY)).rejects.toThrow();
});
it('accepts matching signature and blocks size or extension mismatch',async()=>{
 const bytes=new Uint8Array([137,80,78,71,13,10,26,10]);
 await expect(validateUpload(new File([bytes],'a.png',{type:'image/png'}),DEFAULT_UPLOAD_POLICY)).resolves.toBeUndefined();
 await expect(validateUpload(new File([bytes],'a.pdf',{type:'image/png'}),DEFAULT_UPLOAD_POLICY)).rejects.toThrow();
 await expect(validateUpload(new File([bytes],'a.png',{type:'image/png'}),{...DEFAULT_UPLOAD_POLICY,maxBytes:4})).rejects.toThrow();
});
