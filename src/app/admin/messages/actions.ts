"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { setContactStatus } from "@/lib/contact";
import { isAdmin } from "@/lib/submissions";

async function mark(id: number, status: "open" | "done") {
  const user = await getCurrentUser();
  if (!isAdmin(user?.email)) notFound();
  await setContactStatus(id, status);
  refresh();
}

export async function markDone(id: number) {
  await mark(id, "done");
}

export async function reopen(id: number) {
  await mark(id, "open");
}
