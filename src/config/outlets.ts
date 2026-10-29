import type { TopicSlug } from "./topics";

export const REGIONS = ["uk", "us", "intl", "africa"] as const;
export type Region = (typeof REGIONS)[number];

export function isRegion(value: unknown): value is Region {
  return REGIONS.includes(value as Region);
}
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
      { url: "https://feeds.bbci.co.uk/news/politics/rss.xml", topics: ["uk"] },
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", topics: ["world"] },
      { url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", topics: ["africa"] },
      { url: "https://feeds.bbci.co.uk/news/business/rss.xml", topics: ["business"] },
      { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", topics: ["tech"] },
      { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", topics: ["science"] },
      { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", topics: ["football"] },
      { url: "https://feeds.bbci.co.uk/sport/africa/rss.xml", topics: ["africa", "football"] },
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
      { url: "https://www.theguardian.com/world/africa/rss", topics: ["africa"] },
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
      { url: "https://feeds.skynews.com/feeds/rss/politics.xml", topics: ["uk"] },
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
  {
    id: "telegraph",
    name: "The Telegraph",
    homepage: "https://www.telegraph.co.uk",
    region: "uk",
    kind: "national",
    quality: 0.85,
    feeds: [
      { url: "https://www.telegraph.co.uk/rss.xml", topics: ["uk"] },
      { url: "https://www.telegraph.co.uk/business/rss.xml", topics: ["business"] },
      { url: "https://www.telegraph.co.uk/football/rss.xml", topics: ["football"] },
    ],
  },
  {
    id: "mirror",
    name: "Daily Mirror",
    homepage: "https://www.mirror.co.uk",
    region: "uk",
    kind: "national",
    quality: 0.7,
    feeds: [
      { url: "https://www.mirror.co.uk/news/?service=rss", topics: ["uk"] },
      { url: "https://www.mirror.co.uk/sport/football/?service=rss", topics: ["football"] },
    ],
  },
  {
    id: "evening-standard",
    name: "Evening Standard",
    homepage: "https://www.standard.co.uk",
    region: "uk",
    kind: "national",
    quality: 0.75,
    feeds: [
      { url: "https://www.standard.co.uk/news/uk/rss", topics: ["uk"] },
    ],
  },
  {
    id: "inews",
    name: "The i Paper",
    homepage: "https://inews.co.uk",
    region: "uk",
    kind: "national",
    quality: 0.8,
    feeds: [
      { url: "https://inews.co.uk/feed", topics: ["uk"] },
    ],
  },
  {
    id: "ft",
    name: "Financial Times",
    homepage: "https://www.ft.com",
    region: "uk",
    kind: "national",
    quality: 0.95,
    feeds: [
      { url: "https://www.ft.com/rss/home/uk", topics: ["business", "world"] },
    ],
  },
  {
    id: "city-am",
    name: "City AM",
    homepage: "https://www.cityam.com",
    region: "uk",
    kind: "trade",
    quality: 0.75,
    feeds: [
      { url: "https://www.cityam.com/feed/", topics: ["business"] },
    ],
  },
  {
    id: "channel-4-news",
    name: "Channel 4 News",
    homepage: "https://www.channel4.com/news",
    region: "uk",
    kind: "broadcaster",
    quality: 0.85,
    feeds: [
      { url: "https://www.channel4.com/news/feed", topics: ["uk"] },
    ],
  },
  {
    id: "scotsman",
    name: "The Scotsman",
    homepage: "https://www.scotsman.com",
    region: "uk",
    kind: "national",
    quality: 0.75,
    feeds: [
      { url: "https://www.scotsman.com/rss", topics: ["uk"] },
    ],
  },
  {
    id: "conversation-uk",
    name: "The Conversation UK",
    homepage: "https://theconversation.com/uk",
    region: "uk",
    kind: "specialist",
    quality: 0.85,
    feeds: [
      { url: "https://theconversation.com/uk/articles.atom", topics: ["uk", "science"] },
    ],
  },
  {
    id: "sky-sports",
    name: "Sky Sports",
    homepage: "https://www.skysports.com",
    region: "uk",
    kind: "broadcaster",
    quality: 0.85,
    feeds: [
      { url: "https://www.skysports.com/rss/12040", topics: ["football"] },
    ],
  },
  {
    id: "football365",
    name: "Football365",
    homepage: "https://www.football365.com",
    region: "uk",
    kind: "specialist",
    quality: 0.65,
    feeds: [
      { url: "https://www.football365.com/rss", topics: ["football"] },
    ],
  },
  {
    id: "espn",
    name: "ESPN",
    homepage: "https://www.espn.com",
    region: "us",
    kind: "broadcaster",
    quality: 0.8,
    feeds: [
      { url: "https://www.espn.com/espn/rss/soccer/news", topics: ["football"] },
    ],
  },
  {
    id: "nature",
    name: "Nature",
    homepage: "https://www.nature.com",
    region: "intl",
    kind: "specialist",
    quality: 0.95,
    feeds: [
      { url: "https://www.nature.com/nature.rss", topics: ["science"] },
    ],
  },
  {
    id: "science-daily",
    name: "ScienceDaily",
    homepage: "https://www.sciencedaily.com",
    region: "us",
    kind: "specialist",
    quality: 0.75,
    feeds: [
      { url: "https://www.sciencedaily.com/rss/all.xml", topics: ["science"] },
    ],
  },
  {
    id: "phys-org",
    name: "Phys.org",
    homepage: "https://phys.org",
    region: "intl",
    kind: "specialist",
    quality: 0.7,
    feeds: [
      { url: "https://phys.org/rss-feed/", topics: ["science"] },
    ],
  },
  {
    id: "wired",
    name: "Wired",
    homepage: "https://www.wired.com",
    region: "us",
    kind: "specialist",
    quality: 0.85,
    feeds: [
      { url: "https://www.wired.com/feed/rss", topics: ["tech"] },
    ],
  },
  {
    id: "engadget",
    name: "Engadget",
    homepage: "https://www.engadget.com",
    region: "us",
    kind: "specialist",
    quality: 0.75,
    feeds: [
      { url: "https://www.engadget.com/rss.xml", topics: ["tech"] },
    ],
  },
  {
    id: "cnbc",
    name: "CNBC",
    homepage: "https://www.cnbc.com",
    region: "us",
    kind: "broadcaster",
    quality: 0.85,
    feeds: [
      { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", topics: ["business"] },
    ],
  },
  {
    id: "marketwatch",
    name: "MarketWatch",
    homepage: "https://www.marketwatch.com",
    region: "us",
    kind: "national",
    quality: 0.8,
    feeds: [
      { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", topics: ["business"] },
    ],
  },
  {
    id: "dw",
    name: "Deutsche Welle",
    homepage: "https://www.dw.com/en",
    region: "intl",
    kind: "broadcaster",
    quality: 0.9,
    feeds: [
      { url: "https://rss.dw.com/rdf/rss-en-all", topics: ["world"] },
      { url: "https://rss.dw.com/rdf/rss-en-africa", topics: ["africa"] },
    ],
  },
  {
    id: "france-24",
    name: "France 24",
    homepage: "https://www.france24.com/en",
    region: "intl",
    kind: "broadcaster",
    quality: 0.85,
    feeds: [
      { url: "https://www.france24.com/en/rss", topics: ["world"] },
      { url: "https://www.france24.com/en/africa/rss", topics: ["africa"] },
    ],
  },
  {
    id: "euronews",
    name: "Euronews",
    homepage: "https://www.euronews.com",
    region: "intl",
    kind: "broadcaster",
    quality: 0.8,
    feeds: [
      { url: "https://www.euronews.com/rss", topics: ["world"] },
    ],
  },
  {
    id: "cbs-news",
    name: "CBS News",
    homepage: "https://www.cbsnews.com",
    region: "us",
    kind: "broadcaster",
    quality: 0.85,
    feeds: [
      { url: "https://www.cbsnews.com/latest/rss/main", topics: ["world"] },
    ],
  },
  {
    id: "abc-news",
    name: "ABC News",
    homepage: "https://abcnews.go.com",
    region: "us",
    kind: "broadcaster",
    quality: 0.85,
    feeds: [
      { url: "https://abcnews.go.com/abcnews/topstories", topics: ["world"] },
    ],
  },
  // Africa: Pan-African
  {
    id: "allafrica",
    name: "AllAfrica",
    homepage: "https://allafrica.com",
    region: "africa",
    kind: "wire",
    quality: 0.75,
    feeds: [
      { url: "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", topics: ["africa"] },
    ],
  },
  {
    id: "the-africa-report",
    name: "The Africa Report",
    homepage: "https://www.theafricareport.com",
    region: "africa",
    kind: "specialist",
    quality: 0.85,
    feeds: [
      { url: "https://www.theafricareport.com/feed/", topics: ["africa", "business"] },
    ],
  },
  {
    id: "the-east-african",
    name: "The EastAfrican",
    homepage: "https://www.theeastafrican.co.ke",
    region: "africa",
    kind: "national",
    quality: 0.85,
    feeds: [
      { url: "https://www.theeastafrican.co.ke/rss.xml", topics: ["africa"] },
    ],
  },
  {
    id: "african-arguments",
    name: "African Arguments",
    homepage: "https://africanarguments.org",
    region: "africa",
    kind: "specialist",
    quality: 0.8,
    feeds: [
      { url: "https://africanarguments.org/feed/", topics: ["africa"] },
    ],
  },
  // Africa: South Africa
  {
    id: "daily-maverick",
    name: "Daily Maverick",
    homepage: "https://www.dailymaverick.co.za",
    region: "africa",
    kind: "national",
    quality: 0.9,
    feeds: [
      { url: "https://www.dailymaverick.co.za/dmrss/", topics: ["africa"] },
    ],
  },
  {
    id: "iol",
    name: "IOL",
    homepage: "https://www.iol.co.za",
    region: "africa",
    kind: "national",
    quality: 0.7,
    feeds: [
      { url: "https://www.iol.co.za/rss", topics: ["africa"] },
    ],
  },
  {
    id: "moneyweb",
    name: "Moneyweb",
    homepage: "https://www.moneyweb.co.za",
    region: "africa",
    kind: "trade",
    quality: 0.8,
    feeds: [
      { url: "https://www.moneyweb.co.za/feed/", topics: ["africa", "business"] },
    ],
  },
  // Africa: Nigeria
  {
    id: "premium-times",
    name: "Premium Times",
    homepage: "https://www.premiumtimesng.com",
    region: "africa",
    kind: "national",
    quality: 0.85,
    feeds: [
      { url: "https://www.premiumtimesng.com/feed", topics: ["africa"] },
    ],
  },
  {
    id: "punch",
    name: "The Punch",
    homepage: "https://punchng.com",
    region: "africa",
    kind: "national",
    quality: 0.75,
    feeds: [
      { url: "https://punchng.com/feed/", topics: ["africa"] },
    ],
  },
  {
    id: "vanguard",
    name: "Vanguard",
    homepage: "https://www.vanguardngr.com",
    region: "africa",
    kind: "national",
    quality: 0.7,
    feeds: [
      { url: "https://www.vanguardngr.com/feed/", topics: ["africa"] },
    ],
  },
  {
    id: "channels-tv",
    name: "Channels Television",
    homepage: "https://www.channelstv.com",
    region: "africa",
    kind: "broadcaster",
    quality: 0.8,
    feeds: [
      { url: "https://www.channelstv.com/feed/", topics: ["africa"] },
    ],
  },
  {
    id: "businessday-ng",
    name: "BusinessDay",
    homepage: "https://businessday.ng",
    region: "africa",
    kind: "trade",
    quality: 0.8,
    feeds: [
      { url: "https://businessday.ng/feed/", topics: ["africa", "business"] },
    ],
  },
  {
    id: "techcabal",
    name: "TechCabal",
    homepage: "https://techcabal.com",
    region: "africa",
    kind: "specialist",
    quality: 0.8,
    feeds: [
      { url: "https://techcabal.com/feed/", topics: ["africa", "tech"] },
    ],
  },
  // Africa: Kenya
  {
    id: "nation-kenya",
    name: "Daily Nation",
    homepage: "https://nation.africa/kenya",
    region: "africa",
    kind: "national",
    quality: 0.85,
    feeds: [
      { url: "https://nation.africa/kenya/rss.xml", topics: ["africa"] },
    ],
  },
  {
    id: "standard-kenya",
    name: "The Standard",
    homepage: "https://www.standardmedia.co.ke",
    region: "africa",
    kind: "national",
    quality: 0.8,
    feeds: [
      { url: "https://www.standardmedia.co.ke/rss/headlines.php", topics: ["africa"] },
    ],
  },
  {
    id: "capital-fm-kenya",
    name: "Capital FM",
    homepage: "https://www.capitalfm.co.ke/news",
    region: "africa",
    kind: "broadcaster",
    quality: 0.75,
    feeds: [
      { url: "https://www.capitalfm.co.ke/news/feed/", topics: ["africa"] },
    ],
  },
  // Africa: Ghana
  {
    id: "myjoyonline",
    name: "MyJoyOnline",
    homepage: "https://www.myjoyonline.com",
    region: "africa",
    kind: "broadcaster",
    quality: 0.8,
    feeds: [
      { url: "https://www.myjoyonline.com/feed/", topics: ["africa"] },
    ],
  },
  {
    id: "graphic-ghana",
    name: "Graphic Online",
    homepage: "https://www.graphic.com.gh",
    region: "africa",
    kind: "national",
    quality: 0.8,
    feeds: [
      { url: "https://www.graphic.com.gh/news.feed?type=rss", topics: ["africa"] },
    ],
  },
  // Africa: Zimbabwe
  {
    id: "newsday-zw",
    name: "NewsDay",
    homepage: "https://www.newsday.co.zw",
    region: "africa",
    kind: "national",
    quality: 0.75,
    feeds: [
      { url: "https://www.newsday.co.zw/feed", topics: ["africa"] },
    ],
  },
  {
    id: "herald-zw",
    name: "The Herald",
    homepage: "https://www.herald.co.zw",
    region: "africa",
    kind: "national",
    quality: 0.65,
    feeds: [
      { url: "https://www.herald.co.zw/feed/", topics: ["africa"] },
    ],
  },
  {
    id: "new-zimbabwe",
    name: "NewZimbabwe",
    homepage: "https://www.newzimbabwe.com",
    region: "africa",
    kind: "national",
    quality: 0.7,
    feeds: [
      { url: "https://www.newzimbabwe.com/feed/", topics: ["africa"] },
    ],
  },
  // Africa: Uganda and Tanzania
  {
    id: "daily-monitor",
    name: "Daily Monitor",
    homepage: "https://www.monitor.co.ug",
    region: "africa",
    kind: "national",
    quality: 0.8,
    feeds: [
      { url: "https://www.monitor.co.ug/rss.xml", topics: ["africa"] },
    ],
  },
  {
    id: "the-citizen-tz",
    name: "The Citizen",
    homepage: "https://www.thecitizen.co.tz",
    region: "africa",
    kind: "national",
    quality: 0.8,
    feeds: [
      { url: "https://www.thecitizen.co.tz/rss.xml", topics: ["africa"] },
    ],
  },
];
