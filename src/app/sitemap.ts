import type { MetadataRoute } from "next";
import { parseServerConfig } from "@/src/lib/config/schema";
export default function sitemap(): MetadataRoute.Sitemap {
  const config = parseServerConfig(process.env);
  if (config.deploymentEnv !== "production") return [];
  // Only publish known public entry routes; individual records come from the catalog.
  return ["/", "/products", "/suppliers"].map((path) => ({
    url: `${config.siteUrl}${path}`,
    changeFrequency: "weekly" as const,
  }));
}
