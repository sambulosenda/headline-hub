"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { toggleSavedStory } from "@/lib/saved";

export async function toggleSaved(storyId: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!Number.isSafeInteger(storyId) || storyId <= 0) return;
  await toggleSavedStory(user.id, storyId);
  refresh();
}
