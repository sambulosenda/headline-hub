"use server";

import { cookies } from "next/headers";
import { cleanKeyword, MAX_KEYWORDS, MUTES_COOKIE, NO_MUTES, serializeMutes, toggle, type Mutes } from "@/lib/mutes";
import { getMutes } from "@/lib/mutes-server";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Browsers drop cookies over 4KB; leave room for the name and attributes. */
const MAX_COOKIE_BYTES = 3800;

async function save(mutes: Mutes) {
  const value = serializeMutes(mutes);
  // Non-Latin keywords percent-encode to several bytes a character, so check the encoded size.
  if (encodeURIComponent(value).length > MAX_COOKIE_BYTES) return;
  (await cookies()).set(MUTES_COOKIE, value, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

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
