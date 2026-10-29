// Offline verification: real Semi UI components, no web server or backend.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const require = createRequire(import.meta.url);
const { build } = require(createRequire(require.resolve('tsx/package.json')).resolve('esbuild'));
const result = await build({
  stdin: { contents: `
    import {createRoot} from 'react-dom/client';
    import {AuthField} from './src/components/auth/AuthField';
    import {TextArea} from '@douyinfe/semi-ui-19';
    import styles from './src/components/auth/auth.module.css';
    const zh=window.fixtureLocale==='zh';
    createRoot(document.getElementById('root')).render(<section className={styles.shell} data-locale={window.fixtureLocale}><form className={styles.form} style={{margin:'36px auto',padding:12}}>
      <AuthField id="email" label={zh?'邮箱':'Email'} type="email"/>
      <AuthField id="password" label={zh?'当前密码':'Current password'} type="password"/>
      <AuthField id="invalid" label={zh?'验证码':'Verification code'} validateStatus="error"/>
      <AuthField id="disabled" label={zh?'禁用':'Disabled'} type="password" disabled/>
      <div className="shhy-field"><label htmlFor="notes">Notes</label><TextArea id="notes"/></div>
      <button type="button" id="native-button">Continue</button>
    </form></section>);
  `, loader: 'tsx', resolveDir: process.cwd() },
  bundle:true, write:false, outdir:'/tmp/manulink-auth-focus', platform:'browser', format:'iife', jsx:'automatic', minify:true,
  loader:{'.module.css':'local-css','.css':'css'}, define:{'process.env.NODE_ENV':'"production"'},
  plugins:[{name:'offline-foundation',setup(build){
    build.onResolve({filter:/Providers$/},()=>({path:'foundation',namespace:'offline'}));
    build.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:`export const useFoundation=()=>({locale:window.fixtureLocale});`,loader:'js'}));
  }}],
});
const script=result.outputFiles.find(file=>file.path.endsWith('.js')).text;
const moduleCss=result.outputFiles.find(file=>file.path.endsWith('.css')).text;
const styles = await Promise.all([
  'node_modules/@douyinfe/semi-ui-19/dist/css/semi.min.css',
  'src/styles/tokens.css','src/app/globals.css','src/styles/semi-theme.css',
].map(path=>readFile(path,'utf8')));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  for(const width of [1440,390]) for(const locale of ['zh','en']) {
    const page=await browser.newPage({viewport:{width,height:1000}});
    await page.route('**/*',route=>route.abort());
    await page.setContent('<!doctype html><html><head></head><body><div id="root"></div></body></html>');
    await page.evaluate(locale=>{window.fixtureLocale=locale;},locale);
    await page.addStyleTag({content:[styles[0],moduleCss,...styles.slice(1)].join('\n').replace(/@import[^;]+;/g,'')});
    await page.addScriptTag({content:script});
    await page.locator('#email').waitFor();
    for(const id of ['email','password','invalid','notes']) {
      await page.locator('#'+id).focus();
      const state=await page.locator('#'+id).evaluate(el=>{
        const wrapper=el.closest('.semi-input-wrapper,.semi-input-textarea-wrapper');
        const rect=wrapper.getBoundingClientRect();
        return {outline:getComputedStyle(el).outlineStyle,shadow:getComputedStyle(wrapper).boxShadow,focused:wrapper.className.includes('focus'),left:rect.left,right:rect.right,width:rect.width};
      });
      assert.equal(state.outline,'none',`${width}/${locale}/${id}: duplicate inner focus ring`);
      assert.equal(state.focused,true);
      assert.ok(state.width>=200 && state.left>=0 && state.right<=width,`${id}: input overflows viewport`);
      assert.notEqual(state.shadow,'none',`${id}: accessible wrapper focus ring missing`);
    }
    await page.locator('#password').fill('test-password');
    const eye=page.locator('.shhy-field').filter({has:page.locator('#password')}).getByRole('button',{name:locale==='zh'?'显示密码':'Show password',exact:true});
    await eye.click();
    assert.equal(await page.locator('#password').getAttribute('type'),'text');
    assert.equal(await page.locator('#password').inputValue(),'test-password');
    const disabled=page.locator('.shhy-field').filter({has:page.locator('#disabled')}).getByRole('button');
    assert.equal(await disabled.isDisabled(),true);
    await page.locator('#notes').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#native-button').evaluate(el=>el===document.activeElement),true);
    assert.notEqual(await page.locator('#native-button').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
    await page.locator('#password').focus();
    await mkdir('test-results/auth-field-focus',{recursive:true});
    await page.screenshot({path:`test-results/auth-field-focus/${locale}-${width}.png`});
    await page.close();
    console.log(`PASS real Semi UI focus/password/disabled ${locale} ${width}px`);
  }
} finally {await browser.close();}
