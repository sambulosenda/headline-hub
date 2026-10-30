"use client";

import { useActionState } from "react";
import { CONTACT_REASONS, type ContactReason } from "@/config/contact";
import { contactAction, type ContactState } from "./actions";

const input = "w-full rounded-lg border border-line bg-background px-3 py-1.5 text-sm";

export function ContactForm({ reason, url }: { reason?: ContactReason; url?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(contactAction, null);

  if (state?.ok) {
    return (
      <div role="status" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-semibold">Thanks, we&apos;ve got your message</h2>
        <p className="mt-1 text-sm text-muted">
          A person reads every message. We aim to reply within two working days, and to act on takedown requests sooner.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <fieldset>
        <legend className="text-sm font-medium">What is it about?</legend>
        <div className="mt-1 space-y-1 text-sm">
          {CONTACT_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2">
              <input type="radio" name="reason" value={r.value} required defaultChecked={r.value === reason} /> {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Your name
          </label>
          <input id="name" name="name" required maxLength={100} autoComplete="name" className={`mt-1 ${input}`} />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Your email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className={`mt-1 ${input}`} />
        </div>
      </div>
      <div>
        <label htmlFor="organisation" className="text-sm font-medium">
          Publication or organisation <span className="font-normal text-muted">(needed for takedowns)</span>
        </label>
        <input id="organisation" name="organisation" maxLength={120} autoComplete="organization" className={`mt-1 ${input}`} />
      </div>
      <div>
        <label htmlFor="url" className="text-sm font-medium">
          Link to the page or article <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="url" name="url" type="url" maxLength={500} defaultValue={url} placeholder="https://" className={`mt-1 ${input}`} />
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <textarea id="message" name="message" rows={5} required maxLength={3000} className={`mt-1 ${input}`} />
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
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
