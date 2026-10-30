"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin, reviewSubmission } from "@/lib/submissions";

async function review(id: number, status: "approved" | "rejected") {
  const user = await getCurrentUser();
  if (!isAdmin(user?.email)) notFound();
  await reviewSubmission(id, status);
  refresh();
}

export async function approveSubmission(id: number) {
  await review(id, "approved");
}

export async function rejectSubmission(id: number) {
  await review(id, "rejected");
}
