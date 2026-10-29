"use client";

import { useActionState } from "react";
import { sendSignInLink, type SignInState } from "./actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(sendSignInLink, null);

  if (state?.ok) {
    return (
      <div role="status" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-semibold">Check your email</h2>
        <p className="mt-1 text-sm text-muted">
          We sent a sign-in link to <strong className="text-foreground">{state.email}</strong>. It works once and
          expires in 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <label htmlFor="email" className="text-sm font-medium">
        Email address
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:text-black"
        >
          {pending ? "Sending…" : "Email me a link"}
        </button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {state.error}
        </p>
      )}
    </form>
  );
}
