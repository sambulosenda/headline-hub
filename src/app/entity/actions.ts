"use server";

import { resolveEntity } from "@/lib/entities";
import { cleanKeyword, MAX_FOLLOWS, MAX_KEYWORDS, toggle } from "@/lib/mutes";
import { getMutes, saveMutes } from "@/lib/mutes-server";

export async function toggleFollow(slug: string) {
  if (!(await resolveEntity(slug))) return;
  const mutes = await getMutes();
  if (!mutes.follows.includes(slug) && mutes.follows.length >= MAX_FOLLOWS) return;
  await saveMutes({ ...mutes, follows: toggle(mutes.follows, slug) });
}

/** Muting a name mutes each of its terms as a keyword, so it shows (and can be undone) in settings too. */
export async function toggleEntityMute(slug: string) {
  const entity = await resolveEntity(slug);
  if (!entity) return;
  const terms = [...new Set(entity.terms.map(cleanKeyword).filter((t): t is string => t !== null))];
  const mutes = await getMutes();
  if (terms.every((t) => mutes.keywords.includes(t))) {
    await saveMutes({ ...mutes, keywords: mutes.keywords.filter((k) => !terms.includes(k)) });
    return;
  }
  const keywords = [...new Set([...mutes.keywords, ...terms])];
  if (keywords.length > MAX_KEYWORDS) return;
  await saveMutes({ ...mutes, keywords });
}
