import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const outlets = pgTable("outlets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  homepage: text("homepage").notNull(),
  region: text("region").notNull(),
  kind: text("kind").notNull(),
  quality: real("quality").notNull(),
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
    outletCount: integer("outlet_count").notNull().default(1),
    recentOutlets: integer("recent_outlets").notNull().default(1),
    avgQuality: real("avg_quality").notNull().default(1),
    score: real("score").notNull().default(0),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("stories_score_idx").on(t.score), index("stories_last_seen_idx").on(t.lastSeenAt)],
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
    tokens: text("tokens").array().notNull(),
    /** Publisher's date when given and sane, otherwise when we first saw it. */
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("articles_story_idx").on(t.storyId),
    index("articles_published_idx").on(t.publishedAt),
  ],
);

export type Outlet = typeof outlets.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Story = typeof stories.$inferSelect;
