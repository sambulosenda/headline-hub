import Parser from "rss-parser";
import { canonicalUrl, cleanText } from "./normalize";

export interface FeedItem {
  url: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: Date | null;
}

type MediaItem = {
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string; medium?: string } } | { $?: { url?: string } }[];
  mediaThumbnail?: { $?: { url?: string } } | { $?: { url?: string } }[];
};

const parser = new Parser<Record<string, unknown>, MediaItem>({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
    ],
  },
});

function firstUrl(v: MediaItem["mediaContent"] | MediaItem["mediaThumbnail"]): string | undefined {
  const node = Array.isArray(v) ? v[0] : v;
  return node?.$?.url;
}

function imageOf(item: MediaItem): string | null {
  const fromEnclosure = item.enclosure?.type?.startsWith("image/") ? item.enclosure.url : undefined;
  const url = firstUrl(item.mediaThumbnail) ?? firstUrl(item.mediaContent) ?? fromEnclosure;
  return url && /^https?:\/\//.test(url) ? url : null;
}

/** Parse RSS or Atom XML into clean, deduped items. Bad items are skipped, not fatal. */
export async function parseFeed(xml: string, now = new Date()): Promise<FeedItem[]> {
  const feed = await parser.parseString(xml);
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (const item of feed.items) {
    const url = item.link ? canonicalUrl(item.link) : null;
    const title = cleanText(item.title, 300);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    const date = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null;
    const publishedAt = date && !Number.isNaN(date.getTime()) && date <= now ? date : null;
    items.push({
      url,
      title,
      summary: cleanText(item.contentSnippet ?? item.summary ?? item.content, 280),
      imageUrl: imageOf(item),
      publishedAt,
    });
  }
  return items;
}
