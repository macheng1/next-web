import {it,expect,vi,afterEach} from 'vitest';
afterEach(()=>vi.unstubAllEnvs());
import {apiJson} from '../../src/lib/server/api-response';
it('returns localized validation errors without leaking raw upstream text',async()=>{
 const res=apiJson(new Request('http://localhost/api',{headers:{'accept-language':'en'}}),{error:'请输入邮箱'},{status:400});
 expect(await res.json()).toMatchObject({message:'Please check your input',errorKey:'invalid_input'});
});
it('returns 400 for empty uploads instead of failing inside validation',async()=>{
 vi.stubEnv('MEMBER_API_URL','http://localhost:4000/api/v1');
 const {POST}=await import('../../src/app/api/upload/web-file/route');
 const {NextRequest}=await import('next/server');
 const form=new FormData();form.append('module','enterprise');
 const response=await POST(new NextRequest('http://localhost:3000/api/upload/web-file',{method:'POST',headers:{origin:'http://localhost:3000'},body:form}));
 expect(response.status).toBe(400);
});
