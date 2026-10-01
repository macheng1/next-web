import type {MetadataRoute} from 'next';
import {parseServerConfig} from '@/src/lib/config/schema';
export default function sitemap():MetadataRoute.Sitemap {
 const config=parseServerConfig(process.env);if(config.deploymentEnv!=='production')return [];
 // Tenant catalog discovery is not implemented; only publish routes known to exist.
 return [{url:`${config.siteUrl}/`,changeFrequency:'weekly'}];
}
