import {it,expect} from 'vitest';
import {apiJson} from '../../src/lib/server/api-response';
it('returns localized validation errors without leaking raw upstream text',async()=>{
 const res=apiJson(new Request('http://localhost/api',{headers:{'accept-language':'en'}}),{error:'请输入邮箱'},{status:400});
 expect(await res.json()).toMatchObject({message:'Please check your input',errorKey:'invalid_input'});
});
