import type { MetadataRoute } from "next";
import { OFFERS, toOfferPath } from "@/features/offers/model/offers";
import { toAbsoluteUrl } from "@/lib/site-url";

type RouteConfig = {
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  lastModified: Date;
};

const OFFERS_LAST_MODIFIED = new Date("2026-09-16");

const ROUTE_CONFIG: Record<string, RouteConfig> = {
  "/": { changeFrequency: "weekly", priority: 1, lastModified: new Date("2026-06-01") },
  "/oferta": { changeFrequency: "monthly", priority: 0.8, lastModified: OFFERS_LAST_MODIFIED },
  "/polityka-prywatnosci": { changeFrequency: "yearly", priority: 0.3, lastModified: new Date("2026-01-01") },
  "/polityka-cookies": { changeFrequency: "yearly", priority: 0.3, lastModified: new Date("2026-01-01") },
};

/* Built from the registry so a new offer is listed without a second edit here.
   The `/o/*` short links stay out — they are print redirects, not content. */
const OFFER_ROUTES: MetadataRoute.Sitemap = OFFERS.map((offer) => ({
  url: toAbsoluteUrl(toOfferPath(offer)),
  changeFrequency: "monthly",
  priority: 0.8,
  lastModified: OFFERS_LAST_MODIFIED,
}));

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...Object.entries(ROUTE_CONFIG).map(([path, config]) => ({
      url: toAbsoluteUrl(path),
      ...config,
    })),
    ...OFFER_ROUTES,
  ];
}
