import type {MetadataRoute} from 'next';
import {parseServerConfig} from '@/src/lib/config/schema';
export default function robots():MetadataRoute.Robots {
 const config=parseServerConfig(process.env);
 if(config.deploymentEnv!=='production')return {rules:[{userAgent:'*',disallow:'/'}]};
 return {rules:[{userAgent:'*',allow:'/',disallow:['/api/','/login','/register','/forgot-password','/reset-password','/change-password']}],sitemap:`${config.siteUrl}/sitemap.xml`};
}
