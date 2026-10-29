import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { savedStories, stories } from "@/db/schema";
import { getCurrentUser } from "./auth";
import { loadCoverage, type StoryWithCoverage } from "./queries";

export const MAX_SAVED = 500;

/** Which of these stories the user has saved. */
export async function getSavedIds(userId: number, storyIds: number[]): Promise<Set<number>> {
  if (storyIds.length === 0) return new Set();
  const rows = await getDb()
    .select({ storyId: savedStories.storyId })
    .from(savedStories)
    .where(and(eq(savedStories.userId, userId), inArray(savedStories.storyId, storyIds)));
  return new Set(rows.map((r) => r.storyId));
}

/** Which of these stories the signed-in reader has saved; empty when signed out. */
export async function savedByCurrentUser(storyIds: number[]): Promise<Set<number>> {
  const user = await getCurrentUser();
  return user ? getSavedIds(user.id, storyIds) : new Set();
}

/** The user's saved stories, newest save first, with every outlet's version. */
export async function getSavedStories(userId: number): Promise<StoryWithCoverage[]> {
  const rows = await getDb()
    .select({ story: stories })
    .from(savedStories)
    .innerJoin(stories, eq(stories.id, savedStories.storyId))
    .where(eq(savedStories.userId, userId))
    .orderBy(desc(savedStories.createdAt))
    .limit(MAX_SAVED);
  if (rows.length === 0) return [];
  const coverage = await loadCoverage(rows.map((r) => r.story.id));
  return rows.map(({ story }) => ({ ...story, coverage: coverage.get(story.id) ?? [] }));
}

/** Saves or unsaves a story; returns whether it is now saved. */
export async function toggleSavedStory(userId: number, storyId: number): Promise<boolean> {
  const db = getDb();
  const removed = await db
    .delete(savedStories)
    .where(and(eq(savedStories.userId, userId), eq(savedStories.storyId, storyId)))
    .returning({ storyId: savedStories.storyId });
  if (removed.length > 0) return false;

  const [story] = await db
    .select({ id: stories.id, leadArticleId: stories.leadArticleId })
    .from(stories)
    .where(eq(stories.id, storyId));
  if (!story) return false;
  const count = await db.$count(savedStories, eq(savedStories.userId, userId));
  if (count >= MAX_SAVED) return false;
  await db
    .insert(savedStories)
    .values({ userId, storyId, articleId: story.leadArticleId })
    .onConflictDoNothing();
  return true;
}
