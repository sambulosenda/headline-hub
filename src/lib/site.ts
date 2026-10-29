/**
 * Public origin used for canonical URLs and link previews. Set SITE_URL in
 * production; on Vercel the production domain is picked up automatically.
 */
export function siteUrl(): URL {
  const explicit = process.env.SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

export const SITE_NAME = "Headline Hub";
