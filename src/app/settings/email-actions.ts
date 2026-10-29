"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { setEmailChoice, unsubscribeByToken } from "@/lib/email-settings";

async function set(key: "digest" | "alerts", on: boolean) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  await setEmailChoice(user.id, key, on);
  refresh();
}

export async function setDigest(on: boolean) {
  await set("digest", on);
}

export async function setAlerts(on: boolean) {
  await set("alerts", on);
}

/** A button press, not the link, unsubscribes, so link scanners in mail apps can't. */
export async function unsubscribe(formData: FormData) {
  const ok = await unsubscribeByToken(String(formData.get("token") ?? ""));
  redirect(ok ? "/unsubscribe?done=1" : "/unsubscribe?invalid=1");
}
