import {NextResponse} from 'next/server';
import {getServerConfig} from '@/src/lib/server/config';
import {checkReadiness} from '@/src/lib/server/health';
export async function GET(){let ready=false;try{ready=await checkReadiness(getServerConfig());}catch{}return NextResponse.json({status:ready?'ready':'unavailable'},{status:ready?200:503,headers:{'Cache-Control':'no-store'}});}
