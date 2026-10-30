import {
  bigserial,
  boolean,
  date,
  jsonb,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const outlets = pgTable("outlets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  homepage: text("homepage").notNull(),
  region: text("region").notNull(),
  kind: text("kind").notNull(),
  quality: real("quality").notNull(),
  /** Home country code for national outlets (src/config/countries.ts). */
  country: text("country"),
  active: boolean("active").notNull().default(true),
});

export const feeds = pgTable("feeds", {
  url: text("url").primaryKey(),
  outletId: text("outlet_id")
    .notNull()
    .references(() => outlets.id),
  topics: text("topics").array().notNull(),
  active: boolean("active").notNull().default(true),
  etag: text("etag"),
  lastModified: text("last_modified"),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  lastStatus: integer("last_status"),
  lastError: text("last_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
});

export const stories = pgTable(
  "stories",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    leadArticleId: integer("lead_article_id"),
    topics: text("topics").array().notNull().default([]),
    countries: text("countries").array().notNull().default([]),
    outletCount: integer("outlet_count").notNull().default(1),
    recentOutlets: integer("recent_outlets").notNull().default(1),
    avgQuality: real("avg_quality").notNull().default(1),
    score: real("score").notNull().default(0),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("stories_score_idx").on(t.score),
    index("stories_last_seen_idx").on(t.lastSeenAt),
    index("stories_countries_idx").using("gin", t.countries),
  ],
);

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull().unique(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id),
    storyId: integer("story_id").references(() => stories.id),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    imageUrl: text("image_url"),
    topics: text("topics").array().notNull(),
    /** Countries the headline or summary names (src/lib/countries.ts); the outlet's own country is added per story. */
    countries: text("countries").array().notNull().default([]),
    tokens: text("tokens").array().notNull(),
    /** Unit-length headline embedding; null when embeddings were off. */
    embedding: real("embedding").array(),
    /** Model that made `embedding`; null means all-MiniLM-L6-v2 (rows from before this column). Vectors from different models are never compared. */
    embeddingModel: text("embedding_model"),
    /** Publisher's date when given and sane, otherwise when we first saw it. */
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("articles_story_idx").on(t.storyId),
    index("articles_published_idx").on(t.publishedAt),
    // Full-text search over headline and summary; src/lib/search.ts must use the same expression.
    index("articles_search_idx").using("gin", sql`to_tsvector('english', ${t.title} || ' ' || ${t.summary})`),
  ],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One-time sign-in links. Only a SHA-256 hash of the token is stored. */
export const loginTokens = pgTable(
  "login_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_tokens_email_idx").on(t.email, t.createdAt)],
);

/** Signed-in browsers. Only a SHA-256 hash of the session token is stored. */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const userPreferences = pgTable("user_preferences", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Same shape as the mutes cookie; re-validated on every read. */
  mutes: jsonb("mutes").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedStories = pgTable(
  "saved_stories",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: integer("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    /** The story's lead article when saved, so the save can follow it if reclustering moves it. */
    articleId: integer("article_id").references(() => articles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.storyId] }), index("saved_stories_user_idx").on(t.userId, t.createdAt)],
);

export const emailSettings = pgTable("email_settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  digest: boolean("digest").notNull().default(false),
  alerts: boolean("alerts").notNull().default(false),
  /** Random secret in every email's unsubscribe link; works without signing in. */
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  lastDigestAt: timestamp("last_digest_at", { withTimezone: true }),
});

export const alertsSent = pgTable(
  "alerts_sent",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: integer("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.storyId] }), index("alerts_sent_user_idx").on(t.userId, t.sentAt)],
);

export const feedSubmissions = pgTable(
  "feed_submissions",
  {
    id: serial("id").primaryKey(),
    outletName: text("outlet_name").notNull(),
    homepage: text("homepage").notNull(),
    feedUrl: text("feed_url").notNull().unique(),
    contactEmail: text("contact_email").notNull(),
    region: text("region").notNull(),
    topics: text("topics").array().notNull(),
    notes: text("notes").notNull().default(""),
    /** Automatic check results (src/lib/vet-feed.ts) and sample headlines. */
    vetting: jsonb("vetting").notNull(),
    /** pending (passed checks), failed_checks, approved or rejected. */
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("feed_submissions_status_idx").on(t.status, t.createdAt), index("feed_submissions_contact_idx").on(t.contactEmail, t.createdAt)],
);

export type Outlet = typeof outlets.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Story = typeof stories.$inferSelect;

/**
 * Cookieless visit counting (src/lib/analytics.ts). No IP addresses or user ids
 * are stored; `visitor` is a hash with a salt that is replaced every day.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** view (a page was shown) or out (a click through to a publisher). */
    kind: text("kind").notNull(),
    /** The page path for a view; the publisher's article URL for an out. */
    target: text("target").notNull(),
    /** Host of the site that sent the visitor, on the first page of a visit only. */
    referrer: text("referrer"),
    visitor: text("visitor").notNull(),
    device: text("device").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analytics_events_kind_idx").on(t.kind, t.createdAt)],
);

export const analyticsSalts = pgTable("analytics_salts", {
  day: date("day").primaryKey(),
  salt: text("salt").notNull(),
});

/**
 * Names in the news (src/lib/names.ts), refreshed on every ingest pass. Rows
 * are kept for a while after a name drops out so its page keeps working.
 */
export const trendingNames = pgTable(
  "trending_names",
  {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    /** "auto" for names spotted in headlines, otherwise the listed entity's kind. */
    kind: text("kind").notNull(),
    outlets: integer("outlets").notNull(),
    articles: integer("articles").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("trending_names_seen_idx").on(t.lastSeenAt)],
);

/**
 * Messages sent through /contact: takedown and correction requests from
 * publishers, privacy requests and anything else. Reviewed on /admin/messages.
 */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    /** takedown, correction, privacy, feed or other (src/lib/contact.ts). */
    reason: text("reason").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    organisation: text("organisation").notNull().default(""),
    /** The page on our site or the publisher's article the message is about. */
    url: text("url").notNull().default(""),
    message: text("message").notNull(),
    /** open or done. */
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    handledAt: timestamp("handled_at", { withTimezone: true }),
  },
  (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt), index("contact_messages_email_idx").on(t.email, t.createdAt)],
);
