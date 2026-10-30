import { and, desc, eq, gt, sql } from "drizzle-orm";
import { OUTLETS, isRegion } from "@/config/outlets";
import { TOPICS } from "@/config/topics";
import { getDb } from "@/db/client";
import { feedSubmissions } from "@/db/schema";
import { slugify } from "./slug";
import { normalizeEmail } from "./tokens";
import { vetFeed, type FeedVetting } from "./vet-feed";

export const SUBMISSIONS_PER_DAY = 3;

export interface SubmissionInput {
  outletName: string;
  homepage: string;
  feedUrl: string;
  contactEmail: string;
  region: string;
  topics: string[];
  notes: string;
}

export type SubmitResult =
  | { ok: true; passed: boolean; vetting: FeedVetting }
  | { ok: false; error: string };

const topicSlugs = new Set<string>(TOPICS.map((t) => t.slug));

/** Canonical form for comparing feed URLs: no fragment, no trailing slash. */
export function normalizeFeedUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Field checks only; the network checks happen in vetFeed. */
export function validateSubmission(input: SubmissionInput): string | null {
  if (input.outletName.trim().length < 2 || input.outletName.length > 80) return "Enter the publication's name.";
  if (!normalizeFeedUrl(input.homepage)) return "Enter the publication's homepage, starting with https://";
  if (!normalizeFeedUrl(input.feedUrl)) return "Enter the RSS or Atom feed URL, starting with https://";
  if (!normalizeEmail(input.contactEmail)) return "Enter an email address we can reach you on.";
  if (!isRegion(input.region)) return "Pick where the publication is based.";
  if (input.topics.length === 0 || input.topics.some((t) => !topicSlugs.has(t))) return "Pick at least one topic.";
  if (input.notes.length > 1000) return "Keep the note under 1,000 characters.";
  return null;
}

const configuredFeeds = new Set(OUTLETS.flatMap((o) => o.feeds.map((f) => normalizeFeedUrl(f.url))));

export async function submitFeed(input: SubmissionInput): Promise<SubmitResult> {
  const invalid = validateSubmission(input);
  if (invalid) return { ok: false, error: invalid };
  const feedUrl = normalizeFeedUrl(input.feedUrl)!;
  const email = normalizeEmail(input.contactEmail)!;
  if (configuredFeeds.has(feedUrl)) return { ok: false, error: "We already carry that feed." };

  const db = getDb();
  const [existing] = await db
    .select({ status: feedSubmissions.status })
    .from(feedSubmissions)
    .where(eq(feedSubmissions.feedUrl, feedUrl));
  if (existing) return { ok: false, error: "That feed has already been submitted; we'll be in touch." };

  const dayAgo = new Date(Date.now() - 86_400_000);
  const recent = await db.$count(
    feedSubmissions,
    and(eq(feedSubmissions.contactEmail, email), gt(feedSubmissions.createdAt, dayAgo)),
  );
  if (recent >= SUBMISSIONS_PER_DAY) return { ok: false, error: "That's the limit for today. Please try again tomorrow." };

  const vetting = await vetFeed(feedUrl, input.homepage.trim());
  await db
    .insert(feedSubmissions)
    .values({
      outletName: input.outletName.trim(),
      homepage: normalizeFeedUrl(input.homepage)!,
      feedUrl,
      contactEmail: email,
      region: input.region,
      topics: input.topics,
      notes: input.notes.trim(),
      vetting,
      status: vetting.ok ? "pending" : "failed_checks",
    })
    .onConflictDoNothing();
  return { ok: true, passed: vetting.ok, vetting };
}

export type Submission = typeof feedSubmissions.$inferSelect & { vetting: FeedVetting };

/** Newest first, ones waiting for review on top. */
export async function listSubmissions(): Promise<Submission[]> {
  const rows = await getDb()
    .select()
    .from(feedSubmissions)
    .orderBy(sql`${feedSubmissions.status} = 'pending' desc`, desc(feedSubmissions.createdAt))
    .limit(200);
  return rows as Submission[];
}

export async function reviewSubmission(id: number, status: "approved" | "rejected") {
  await getDb().update(feedSubmissions).set({ status, reviewedAt: new Date() }).where(eq(feedSubmissions.id, id));
}

/** Reviewers are the signed-in accounts listed in ADMIN_EMAILS (comma-separated). */
export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** The entry to paste into src/config/outlets.ts once a feed is approved. */
export function configSnippet(s: Pick<Submission, "outletName" | "homepage" | "feedUrl" | "region" | "topics">): string {
  const topics = s.topics.map((t) => JSON.stringify(t)).join(", ");
  return `  {
    id: ${JSON.stringify(slugify(s.outletName, 40))},
    name: ${JSON.stringify(s.outletName)},
    homepage: ${JSON.stringify(s.homepage)},
    region: ${JSON.stringify(s.region)},
    kind: "national", // check: national, broadcaster, trade, wire or specialist
    quality: 0.7, // check: 0.5 to 1.0
    feeds: [{ url: ${JSON.stringify(s.feedUrl)}, topics: [${topics}] }],
  },`;
}
