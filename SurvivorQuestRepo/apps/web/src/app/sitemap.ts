import type { MetadataRoute } from "next";
import { toAbsoluteUrl } from "@/lib/site-url";

type RouteConfig = {
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  lastModified: Date;
};

const ROUTE_CONFIG: Record<string, RouteConfig> = {
  "/": { changeFrequency: "weekly", priority: 1, lastModified: new Date("2026-06-01") },
  "/download": { changeFrequency: "monthly", priority: 0.7, lastModified: new Date("2026-05-01") },
  "/polityka-prywatnosci": { changeFrequency: "yearly", priority: 0.3, lastModified: new Date("2026-01-01") },
  "/polityka-cookies": { changeFrequency: "yearly", priority: 0.3, lastModified: new Date("2026-01-01") },
};

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.entries(ROUTE_CONFIG).map(([path, config]) => ({
    url: toAbsoluteUrl(path),
    ...config,
  }));
}
