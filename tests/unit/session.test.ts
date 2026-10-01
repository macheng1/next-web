import {it,expect,vi,afterEach} from 'vitest';
import {resolveSession} from '../../src/lib/server/session';
import {HttpError} from '../../src/lib/http/types';
import {memberTokenCookieOptions} from '../../src/lib/auth-token';
import {NextRequest} from 'next/server';
import {POST as loginRoute} from '../../src/app/api/auth/[action]/route';
import {POST as logoutRoute} from '../../src/app/api/auth/logout/route';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('missing cookie is anonymous without contacting backend',async()=>{
 const load=vi.fn();expect(await resolveSession(undefined,load)).toEqual({status:'anonymous',invalidated:false});expect(load).not.toHaveBeenCalled();
});
it('separates rejected credentials from service failures',async()=>{
 expect(await resolveSession('token',async()=>{throw new HttpError('http','invalid',401);})).toEqual({status:'anonymous',invalidated:true});
 expect(await resolveSession('token',async()=>{throw new HttpError('http','down',503);})).toEqual({status:'unavailable'});
});
it('never shares identities or private fields',async()=>{
 const a=await resolveSession('a',async()=>({id:'a',email:'a@test.com',memberType:'personal',accessToken:'secret'}));
 const b=await resolveSession('b',async()=>({id:'b',email:'b@test.com',memberType:'enterprise'}));
 expect(a).toMatchObject({member:{id:'a'}});expect(b).toMatchObject({member:{id:'b'}});expect(JSON.stringify(a)).not.toContain('secret');
});
it('caps token cookie lifetime',()=>{
 expect(memberTokenCookieOptions(999999).maxAge).toBe(28800);expect(memberTokenCookieOptions(60).maxAge).toBe(60);
});
it('login retains token only in HttpOnly cookie and logout requires origin',async()=>{
 vi.stubEnv('DEPLOYMENT_ENV','test');vi.stubEnv('MEMBER_API_URL','http://localhost:4000/api/v1');vi.stubEnv('NEXT_PUBLIC_SITE_URL','http://localhost:3000');
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({code:200,data:{accessToken:'private-token',expiresIn:999999,member:{id:'a'}}})));
 const res=await loginRoute(new NextRequest('http://localhost:3000/api/auth/login',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({email:'a@test.com',password:'testing'})}),{params:Promise.resolve({action:'login'})});
 expect(await res.text()).not.toContain('private-token');expect(res.headers.get('set-cookie')).toContain('HttpOnly');expect(res.headers.get('set-cookie')).toContain('Max-Age=28800');
 const bad=await logoutRoute(new NextRequest('http://localhost:3000/api/auth/logout',{method:'POST'}));expect(bad.status).toBe(403);
 const good=await logoutRoute(new NextRequest('http://localhost:3000/api/auth/logout',{method:'POST',headers:{origin:'http://localhost:3000'}}));expect(good.headers.get('set-cookie')).toContain('Max-Age=0');
});
