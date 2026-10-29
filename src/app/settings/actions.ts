"use server";

import { cleanKeyword, MAX_KEYWORDS, NO_MUTES, toggle } from "@/lib/mutes";
import { getMutes, saveMutes as save } from "@/lib/mutes-server";

// Values are re-validated by parseMutes on every read, so a forged id is simply dropped.

export async function toggleOutletMute(outletId: string) {
  const mutes = await getMutes();
  await save({ ...mutes, outlets: toggle(mutes.outlets, outletId) });
}

export async function toggleTopicMute(slug: string) {
  const mutes = await getMutes();
  await save({ ...mutes, topics: toggle(mutes.topics, slug) });
}

export async function addKeywordMute(formData: FormData) {
  const keyword = cleanKeyword(String(formData.get("keyword") ?? ""));
  if (!keyword) return;
  const mutes = await getMutes();
  if (mutes.keywords.includes(keyword) || mutes.keywords.length >= MAX_KEYWORDS) return;
  await save({ ...mutes, keywords: [...mutes.keywords, keyword] });
}

export async function removeKeywordMute(keyword: string) {
  const mutes = await getMutes();
  await save({ ...mutes, keywords: mutes.keywords.filter((k) => k !== keyword) });
}

export async function clearMutes() {
  await save(NO_MUTES);
}
