import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { COUNTRIES } from "@/config/countries";
import { ENTITIES } from "@/config/entities";
import { TOPICS } from "@/config/topics";
import { getSitemapNames, getSitemapStories } from "@/lib/sitemap";
import { absoluteUrl } from "@/lib/site";
import { storyPath } from "@/lib/slug";

type Entry = MetadataRoute.Sitemap[number];

const page = (path: string, changeFrequency: Entry["changeFrequency"], priority: number): Entry => ({
  url: absoluteUrl(path),
  changeFrequency,
  priority,
});

/** Feed pages, then stories more than one outlet is covering, then names in the news. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = [
    page("/", "always", 1),
    page("/latest", "always", 0.8),
    page("/developing", "always", 0.8),
    ...TOPICS.map((t) => page(`/topic/${t.slug}`, "hourly", 0.8)),
    ...COUNTRIES.map((c) => page(`/country/${c.code}`, "hourly", 0.7)),
    page("/entities", "hourly", 0.6),
    ...ENTITIES.map((e) => page(`/entity/${e.slug}`, "daily", 0.5)),
    page("/publishers", "monthly", 0.3),
    page("/submit", "monthly", 0.3),
    page("/privacy", "yearly", 0.2),
    page("/contact", "yearly", 0.2),
  ];

  // Built per request so new stories show up; outside the try so its prerender signal isn't swallowed.
  await connection();
  // Either query failing still leaves the other's URLs in.
  const [stories, names] = await Promise.allSettled([getSitemapStories(), getSitemapNames()]);
  for (const r of [stories, names]) if (r.status === "rejected") console.error(r.reason);
  const listed = new Set(ENTITIES.map((e) => e.slug));
  return [
    ...fixed,
    ...(stories.status === "fulfilled" ? stories.value : []).map((s) => ({
      url: absoluteUrl(storyPath(s.id, s.title)),
      lastModified: s.lastSeenAt,
      changeFrequency: "hourly" as const,
      priority: 0.6,
    })),
    ...(names.status === "fulfilled" ? names.value : [])
      .filter((n) => !listed.has(n.slug))
      .map((n) => ({ url: absoluteUrl(`/entity/${n.slug}`), lastModified: n.lastSeenAt, changeFrequency: "daily" as const, priority: 0.4 })),
  ];
}
