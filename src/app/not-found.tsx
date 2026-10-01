import Link from 'next/link';
import {StatusState} from '@/src/components/StatusState';
import {resolveLocale} from '@/src/lib/locale';
import {foundationCopy} from '@/src/lib/i18n/foundation';
export default async function NotFound(){const locale=await resolveLocale();return <main><StatusState kind="not-found" locale={locale}/><p style={{textAlign:'center'}}><Link href="/">{foundationCopy(locale).backHome}</Link></p></main>;}
