"use server";

import { submitFeed, type SubmitResult } from "@/lib/submissions";

export type SubmitState = SubmitResult | null;

export async function submitFeedAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  // Bots fill every field; people never see this one.
  if (String(formData.get("website") ?? "")) return { ok: false, error: "Something went wrong. Please try again." };
  const text = (k: string) => String(formData.get(k) ?? "");
  try {
    return await submitFeed({
      outletName: text("outletName"),
      homepage: text("homepage"),
      feedUrl: text("feedUrl"),
      contactEmail: text("contactEmail"),
      region: text("region"),
      topics: formData.getAll("topics").map(String),
      notes: text("notes"),
    });
  } catch (err) {
    console.error("[submit] failed", err);
    return { ok: false, error: "We couldn't save that just now. Please try again." };
  }
}
