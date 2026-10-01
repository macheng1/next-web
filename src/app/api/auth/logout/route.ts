import { NextResponse } from 'next/server';
import { guardMutation, mutationFailure } from '@/src/lib/server/mutation';
import { MEMBER_TOKEN_COOKIE, memberTokenCookieOptions } from '@/src/lib/auth-token';
export async function POST(request:Request) {
 try {await guardMutation(request);const response=NextResponse.json({code:200,data:null},{headers:{'Cache-Control':'no-store'}});response.cookies.set(MEMBER_TOKEN_COOKIE,'',memberTokenCookieOptions(0));return response;}catch(error){return mutationFailure(error);}
}
