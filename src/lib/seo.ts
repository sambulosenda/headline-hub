import type { Metadata } from "next";
import { SITE } from "./site";

const SITE_CARD = { url: "/opengraph-image", width: 1200, height: 630, alt: SITE.description };

export interface PageMeta {
  title: string;
  description: string;
  /** Path on this site, used as the canonical link and the share URL. */
  path: string;
  /** The route has its own opengraph-image file. */
  ownCard?: boolean;
}

/**
 * Title, description, canonical link and link-preview tags for a page search
 * engines should index. A page that sets openGraph loses the site-wide card
 * from app/opengraph-image, so it is added back here, except on routes with
 * their own opengraph-image file (an image set here would replace it).
 */
export function pageMetadata({ title, description, path, ownCard = false }: PageMeta): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE.name, url: path, title, description, ...(ownCard ? {} : { images: SITE_CARD }) },
    twitter: { card: "summary_large_image", title, description },
  };
}
