import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { emailSettings } from "@/db/schema";
import { newToken } from "./tokens";

export interface EmailChoices {
  digest: boolean;
  alerts: boolean;
}

export async function getEmailChoices(userId: number): Promise<EmailChoices> {
  const [row] = await getDb()
    .select({ digest: emailSettings.digest, alerts: emailSettings.alerts })
    .from(emailSettings)
    .where(eq(emailSettings.userId, userId));
  return row ?? { digest: false, alerts: false };
}

export async function setEmailChoice(userId: number, key: keyof EmailChoices, on: boolean) {
  await getDb()
    .insert(emailSettings)
    .values({ userId, [key]: on, unsubscribeToken: newToken() })
    .onConflictDoUpdate({ target: emailSettings.userId, set: { [key]: on } });
}

/** Turns every email off for whoever owns this token. False if the token is unknown. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!token) return false;
  const rows = await getDb()
    .update(emailSettings)
    .set({ digest: false, alerts: false })
    .where(eq(emailSettings.unsubscribeToken, token))
    .returning({ userId: emailSettings.userId });
  return rows.length > 0;
}
