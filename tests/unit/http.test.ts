import { it, expect, vi, afterEach } from 'vitest';
import { requestJson, fetchResponse } from '../../src/lib/http/request';
afterEach(() => vi.unstubAllGlobals());
it('rejects business failure even on HTTP 200', async () => {
 vi.stubGlobal('fetch', vi.fn(async () => Response.json({code:10003,message:'invalid'})));
 await expect(requestJson('/api/test')).rejects.toMatchObject({kind:'business',bizCode:10003});
});
it('preserves Headers and leaves multipart content type to fetch', async () => {
 const fake = vi.fn(async (_url, init) => { const headers = new Headers(init.headers); expect(headers.get('custom')).toBe('yes'); expect(headers.has('content-type')).toBe(false); return Response.json({code:200,data:{ok:true}}); });
 vi.stubGlobal('fetch', fake); const body = new FormData(); body.append('file','test');
 expect(await requestJson('/api/test',{method:'POST',body,headers:new Headers({custom:'yes'})})).toEqual({ok:true});
});
it('does not retry POST and retries GET only once when requested', async () => {
 const fake = vi.fn(async () => {throw new TypeError('offline');}); vi.stubGlobal('fetch',fake);
 await expect(requestJson('/api/test',{method:'POST',retries:1})).rejects.toMatchObject({kind:'network'}); expect(fake).toHaveBeenCalledTimes(1);
 fake.mockClear(); await expect(requestJson('/api/test',{retries:1})).rejects.toMatchObject({kind:'network'}); expect(fake).toHaveBeenCalledTimes(2);
});
it('distinguishes cancellation and timeouts including response body', async () => {
 vi.stubGlobal('fetch', vi.fn((_url,init) => new Promise((_resolve,reject) => { init.signal.addEventListener('abort',()=>reject(init.signal.reason)); })));
 await expect(fetchResponse('/api/test',{timeoutMs:10})).rejects.toMatchObject({kind:'timeout'});
 const controller = new AbortController();controller.abort();
 await expect(fetchResponse('/api/test',{signal:controller.signal})).rejects.toMatchObject({kind:'aborted'});
});
it('rejects malformed success responses', async () => {
 vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>gateway</html>')));
 await expect(requestJson('/api/test')).rejects.toMatchObject({kind:'http'});
});
