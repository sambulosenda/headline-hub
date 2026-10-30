/**
 * The site's name and public address. Renaming the site or moving it to a new
 * domain is an edit here; everything else (page titles, share cards, the
 * sitemap, the crawler's user agent, emails) reads from this.
 */
export const SITE = {
  name: "Headline Hub",
  /** The name split in two for share cards, where the second part is drawn in the accent colour. */
  wordmark: ["Headline", "Hub"] as const,
  description: "Every outlet's take on today's stories, grouped and ranked in the open.",
  /** Public address. SITE_URL overrides it per deployment; local dev uses localhost. */
  url: "https://headline-hub.sambulo.workers.dev",
  /** How our feed reader names itself to publishers. Publishers write robots.txt rules against it, so change it rarely. */
  botName: "HeadlineHubBot",
  /** Shown on the contact pages beside the form. Leave empty until the domain has an inbox. */
  contactEmail: "",
};

export const SITE_NAME = SITE.name;

/**
 * Public origin used for canonical URLs, the sitemap and link previews. Order:
 * SITE_URL, then the Vercel production domain, then SITE.url in production
 * builds and localhost everywhere else.
 */
export function siteUrl(): URL {
  const explicit = process.env.SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  if (process.env.NODE_ENV === "production") return new URL(SITE.url);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

/** Absolute URL for a path on this site. */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}
