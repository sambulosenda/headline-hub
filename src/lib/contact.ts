import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { contactMessages } from "@/db/schema";
import { isContactReason } from "@/config/contact";
import { normalizeEmail } from "./tokens";

export const MESSAGES_PER_DAY = 5;

export interface ContactInput {
  reason: string;
  name: string;
  email: string;
  organisation: string;
  url: string;
  message: string;
}

export type ContactResult = { ok: true } | { ok: false; error: string };

/** Field checks; returns the first problem in words a reader can act on. */
export function validateContact(input: ContactInput): string | null {
  if (!isContactReason(input.reason)) return "Pick what your message is about.";
  if (input.name.trim().length < 2 || input.name.length > 100) return "Enter your name.";
  if (!normalizeEmail(input.email)) return "Enter an email address we can reply to.";
  if (input.organisation.length > 120) return "Keep the organisation name under 120 characters.";
  if (input.url.trim() && !/^https?:\/\/\S+$/i.test(input.url.trim())) return "Enter the link starting with https://, or leave it empty.";
  if (input.url.length > 500) return "That link is too long.";
  if (input.message.trim().length < 10) return "Tell us a little more in the message.";
  if (input.message.length > 3000) return "Keep the message under 3,000 characters.";
  if (input.reason === "takedown" && !input.organisation.trim()) return "Enter the publication you're writing for.";
  return null;
}

export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  const invalid = validateContact(input);
  if (invalid) return { ok: false, error: invalid };
  const email = normalizeEmail(input.email)!;

  const db = getDb();
  const dayAgo = new Date(Date.now() - 86_400_000);
  const recent = await db.$count(contactMessages, and(eq(contactMessages.email, email), gt(contactMessages.createdAt, dayAgo)));
  if (recent >= MESSAGES_PER_DAY) return { ok: false, error: "That's the limit for today. Please try again tomorrow." };

  await db.insert(contactMessages).values({
    reason: input.reason,
    name: input.name.trim(),
    email,
    organisation: input.organisation.trim(),
    url: input.url.trim(),
    message: input.message.trim(),
  });
  return { ok: true };
}

export type ContactMessage = typeof contactMessages.$inferSelect;

/** Open messages first, newest first within each. */
export async function listContactMessages(): Promise<ContactMessage[]> {
  return getDb()
    .select()
    .from(contactMessages)
    .orderBy(sql`${contactMessages.status} = 'open' desc`, desc(contactMessages.createdAt))
    .limit(200);
}

export async function setContactStatus(id: number, status: "open" | "done") {
  await getDb()
    .update(contactMessages)
    .set({ status, handledAt: status === "done" ? new Date() : null })
    .where(eq(contactMessages.id, id));
}
