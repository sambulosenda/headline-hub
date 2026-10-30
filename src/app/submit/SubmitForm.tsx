"use client";

import { useActionState } from "react";
import { REGIONS } from "@/config/outlets";
import { TOPICS } from "@/config/topics";
import { submitFeedAction, type SubmitState } from "./actions";

const REGION_NAMES: Record<(typeof REGIONS)[number], string> = {
  uk: "UK",
  us: "US",
  africa: "Africa",
  intl: "International",
};

const input = "w-full rounded-lg border border-line bg-background px-3 py-1.5 text-sm";

export function SubmitForm() {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitFeedAction, null);

  if (state?.ok) {
    return (
      <div role="status" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-semibold">{state.passed ? "Thanks, your feed is in the queue" : "Your feed didn't pass our checks"}</h2>
        <p className="mt-1 text-sm text-muted">
          {state.passed
            ? "It passed our automatic checks. A person will review it before it appears on the site."
            : "We've kept it, but it needs fixing before we can carry it. Here's what we found:"}
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {state.vetting.checks.map((c) => (
            <li key={c.name}>
              <span className={c.status === "fail" ? "text-warn" : c.status === "warn" ? "text-muted" : "text-accent"}>
                {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✗"}
              </span>{" "}
              {c.name}: <span className="text-muted">{c.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div>
        <label htmlFor="outletName" className="text-sm font-medium">
          Publication name
        </label>
        <input id="outletName" name="outletName" required maxLength={80} className={`mt-1 ${input}`} />
      </div>
      <div>
        <label htmlFor="homepage" className="text-sm font-medium">
          Homepage
        </label>
        <input id="homepage" name="homepage" type="url" required placeholder="https://" className={`mt-1 ${input}`} />
      </div>
      <div>
        <label htmlFor="feedUrl" className="text-sm font-medium">
          RSS or Atom feed URL
        </label>
        <input id="feedUrl" name="feedUrl" type="url" required placeholder="https://example.com/feed" className={`mt-1 ${input}`} />
      </div>
      <div>
        <label htmlFor="contactEmail" className="text-sm font-medium">
          Your email
        </label>
        <input id="contactEmail" name="contactEmail" type="email" required autoComplete="email" className={`mt-1 ${input}`} />
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Where is it based?</legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {REGIONS.map((r) => (
            <label key={r} className="flex items-center gap-1.5">
              <input type="radio" name="region" value={r} required /> {REGION_NAMES[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">What does the feed cover?</legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {TOPICS.map((t) => (
            <label key={t.slug} className="flex items-center gap-1.5">
              <input type="checkbox" name="topics" value={t.slug} /> {t.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="notes" className="text-sm font-medium">
          Anything else? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="notes" name="notes" rows={3} maxLength={1000} className={`mt-1 ${input}`} />
      </div>
      <div className="hidden" aria-hidden>
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-warn">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:text-black"
      >
        {pending ? "Checking your feed…" : "Submit feed"}
      </button>
    </form>
  );
}
