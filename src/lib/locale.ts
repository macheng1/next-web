import 'server-only';
import { cookies, headers } from 'next/headers';
import { resolveLanguage } from './i18n/locale';
export async function resolveLocale() {
 const [store,list]=await Promise.all([cookies(),headers()]);
 return resolveLanguage({pathLocale:list.get('x-site-locale') || undefined,cookieLocale:store.get('NEXT_LOCALE')?.value,acceptLanguage:list.get('accept-language') || undefined});
}
