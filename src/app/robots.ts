import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** Personal pages, our own tools and endless search results stay out of search engines. */
const PRIVATE_PATHS = [
  "/admin",
  "/api/",
  "/auth/",
  "/following",
  "/saved",
  "/search",
  "/settings",
  "/signin",
  "/unsubscribe",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
