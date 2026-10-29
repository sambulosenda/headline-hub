import type { TopicSlug } from "./topics";

export type Region = "uk" | "us" | "intl";
export type OutletKind = "national" | "broadcaster" | "trade" | "wire" | "specialist";

export interface OutletConfig {
  id: string;
  name: string;
  homepage: string;
  region: Region;
  kind: OutletKind;
  /** 0.5 to 1.0. Editorial weight used in ranking; review by hand. */
  quality: number;
  feeds: { url: string; topics: TopicSlug[] }[];
}

/**
 * Seed list of publisher feeds. Only official RSS/Atom feeds published by the
 * outlets themselves. Check each publisher's feed terms before going live, and
 * remove an outlet promptly if it asks.
 */
export const OUTLETS: OutletConfig[] = [
  {
    id: "bbc",
    name: "BBC News",
    homepage: "https://www.bbc.co.uk/news",
    region: "uk",
    kind: "broadcaster",
    quality: 1,
    feeds: [
      { url: "https://feeds.bbci.co.uk/news/uk/rss.xml", topics: ["uk"] },
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", topics: ["world"] },
      { url: "https://feeds.bbci.co.uk/news/business/rss.xml", topics: ["business"] },
      { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", topics: ["tech"] },
      { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", topics: ["science"] },
      { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", topics: ["football"] },
    ],
  },
  {
    id: "guardian",
    name: "The Guardian",
    homepage: "https://www.theguardian.com",
    region: "uk",
    kind: "national",
    quality: 0.95,
    feeds: [
      { url: "https://www.theguardian.com/uk-news/rss", topics: ["uk"] },
      { url: "https://www.theguardian.com/world/rss", topics: ["world"] },
      { url: "https://www.theguardian.com/uk/business/rss", topics: ["business"] },
      { url: "https://www.theguardian.com/uk/technology/rss", topics: ["tech"] },
      { url: "https://www.theguardian.com/science/rss", topics: ["science"] },
      { url: "https://www.theguardian.com/football/rss", topics: ["football"] },
    ],
  },
  {
    id: "sky-news",
    name: "Sky News",
    homepage: "https://news.sky.com",
    region: "uk",
    kind: "broadcaster",
    quality: 0.9,
    feeds: [
      { url: "https://feeds.skynews.com/feeds/rss/uk.xml", topics: ["uk"] },
      { url: "https://feeds.skynews.com/feeds/rss/world.xml", topics: ["world"] },
      { url: "https://feeds.skynews.com/feeds/rss/business.xml", topics: ["business"] },
      { url: "https://feeds.skynews.com/feeds/rss/technology.xml", topics: ["tech"] },
    ],
  },
  {
    id: "independent",
    name: "The Independent",
    homepage: "https://www.independent.co.uk",
    region: "uk",
    kind: "national",
    quality: 0.85,
    feeds: [
      { url: "https://www.independent.co.uk/news/uk/rss", topics: ["uk"] },
      { url: "https://www.independent.co.uk/news/world/rss", topics: ["world"] },
      { url: "https://www.independent.co.uk/sport/football/rss", topics: ["football"] },
    ],
  },
  {
    id: "al-jazeera",
    name: "Al Jazeera",
    homepage: "https://www.aljazeera.com",
    region: "intl",
    kind: "broadcaster",
    quality: 0.85,
    feeds: [{ url: "https://www.aljazeera.com/xml/rss/all.xml", topics: ["world"] }],
  },
  {
    id: "npr",
    name: "NPR",
    homepage: "https://www.npr.org",
    region: "us",
    kind: "broadcaster",
    quality: 0.9,
    feeds: [{ url: "https://feeds.npr.org/1004/rss.xml", topics: ["world"] }],
  },
  {
    id: "ars-technica",
    name: "Ars Technica",
    homepage: "https://arstechnica.com",
    region: "us",
    kind: "specialist",
    quality: 0.9,
    feeds: [{ url: "https://feeds.arstechnica.com/arstechnica/index", topics: ["tech", "science"] }],
  },
  {
    id: "the-verge",
    name: "The Verge",
    homepage: "https://www.theverge.com",
    region: "us",
    kind: "specialist",
    quality: 0.8,
    feeds: [{ url: "https://www.theverge.com/rss/index.xml", topics: ["tech"] }],
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    homepage: "https://techcrunch.com",
    region: "us",
    kind: "specialist",
    quality: 0.8,
    feeds: [{ url: "https://techcrunch.com/feed/", topics: ["tech", "business"] }],
  },
];
