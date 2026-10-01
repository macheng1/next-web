import {test,expect} from '@playwright/test';
test.use({baseURL:'http://127.0.0.1:4176'});
test('production build loads without CSP or hydration errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setExtraHTTPHeaders({'accept-language':'en'});const response=await page.goto('/login');
 await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.getByRole('textbox').first()).toBeVisible();
 const csp=response!.headers()['content-security-policy'];expect(csp).toContain("'nonce-");expect(csp).not.toContain('unsafe-eval');
 expect(errors).toEqual([]);await page.screenshot({path:'test-results/production-login.png',fullPage:true});
});
test('health and mutation origin checks on real routes',async({request})=>{
 const live=await request.get('/api/health/live');expect(live.status()).toBe(200);expect(live.headers()['cache-control']).toBe('no-store');
 const me=await request.get('/api/auth/me');expect(me.status()).toBe(401);expect(me.headers()['cache-control']).toBe('no-store');
 const bad=await request.post('/api/auth/login',{data:{email:'person@test.com',password:'password'},headers:{origin:'https://untrusted.test'}});expect(bad.status()).toBe(403);
});
