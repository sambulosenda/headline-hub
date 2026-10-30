"use server";

import { sendContactMessage, type ContactResult } from "@/lib/contact";

export type ContactState = ContactResult | null;

export async function contactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Bots fill every field; people never see this one.
  if (String(formData.get("website") ?? "")) return { ok: false, error: "Something went wrong. Please try again." };
  const text = (k: string) => String(formData.get(k) ?? "");
  try {
    return await sendContactMessage({
      reason: text("reason"),
      name: text("name"),
      email: text("email"),
      organisation: text("organisation"),
      url: text("url"),
      message: text("message"),
    });
  } catch (err) {
    console.error("[contact] failed", err);
    return { ok: false, error: "We couldn't save that just now. Please try again." };
  }
}
