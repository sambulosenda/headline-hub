"use server";

import { redirect } from "next/navigation";
import { consumeSignIn, requestSignIn, signOut, type SignInRequest } from "@/lib/auth";

export type SignInState = SignInRequest | null;

export async function sendSignInLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  try {
    return await requestSignIn(String(formData.get("email") ?? ""));
  } catch (err) {
    console.error("[auth] could not send link", err);
    return { ok: false, error: "We couldn't send the email just now. Please try again." };
  }
}

/** A button press, not the link itself, spends the token, so email scanners that open links can't. */
export async function confirmSignIn(formData: FormData) {
  const ok = await consumeSignIn(String(formData.get("token") ?? ""));
  redirect(ok ? "/settings?signed-in=1" : "/auth/verify?expired=1");
}

export async function signOutAction() {
  await signOut();
  redirect("/settings");
}
