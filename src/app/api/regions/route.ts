import { backendFetch } from '@/src/lib/server/backend';
import { enterpriseResponse } from '@/src/lib/server/enterprise-onboarding';
import { mutationFailure } from '@/src/lib/server/mutation';
export async function GET(request:Request){
  try{return enterpriseResponse(request,await backendFetch('/regions/tree'));}
  catch(error){return mutationFailure(error,request);}
}
