import type { MetadataRoute } from "next";
import { toAbsoluteUrl } from "@/lib/site-url";

const PUBLIC_ROUTES = ["/", "/download", "/polityka-prywatnosci", "/polityka-cookies"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((path) => ({
    url: toAbsoluteUrl(path),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
