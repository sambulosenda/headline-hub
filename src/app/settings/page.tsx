import type { Metadata } from "next";
import { Suspense } from "react";
import { OUTLETS, type Region } from "@/config/outlets";
import { TOPICS } from "@/config/topics";
import Link from "next/link";
import { signOutAction } from "@/app/signin/actions";
import { getCurrentUser } from "@/lib/auth";
import { isEmpty, MAX_KEYWORDS } from "@/lib/mutes";
import { getMutes } from "@/lib/mutes-server";
import {
  addKeywordMute,
  clearMutes,
  removeKeywordMute,
  toggleOutletMute,
  toggleTopicMute,
} from "./actions";

export const metadata: Metadata = { title: "Customise your feed" };

const REGION_NAMES: Record<Region, string> = { uk: "UK", us: "US", intl: "International" };

function Toggle({ muted, label, action }: { muted: boolean; label: string; action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        type="submit"
        aria-pressed={muted}
        className={`rounded-full border px-3 py-1 text-sm ${
          muted ? "border-line bg-surface text-muted line-through" : "border-accent bg-accent-soft text-accent"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-3 text-sm text-muted">{hint}</p>
      {children}
    </section>
  );
}

async function Account() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <p className="mb-4 mt-1 text-sm text-muted">
        Tap to mute or unmute. Choices are saved in this browser.{" "}
        <Link href="/signin" className="text-accent hover:underline">
          Sign in
        </Link>{" "}
        to keep them on every device.
      </p>
    );
  }
  return (
    <div className="mb-4 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span>
        Tap to mute or unmute. Saved to <strong className="text-foreground">{user.email}</strong>.
      </span>
      <form action={signOutAction}>
        <button type="submit" className="underline hover:text-foreground">
          Sign out
        </button>
      </form>
    </div>
  );
}

async function SettingsForm() {
  const mutes = await getMutes();
  const regions = (["uk", "us", "intl"] as const).map((region) => ({
    region,
    outlets: OUTLETS.filter((o) => o.region === region).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div className="space-y-4">
      <Section title="Topics" hint="Muted topics disappear from Top, Latest and Developing. Their own pages still work.">
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <Toggle
              key={t.slug}
              label={t.name}
              muted={mutes.topics.includes(t.slug)}
              action={toggleTopicMute.bind(null, t.slug)}
            />
          ))}
        </div>
      </Section>

      <Section title="Sources" hint="Muted sources are hidden everywhere, and stories only they cover are dropped.">
        <div className="space-y-3">
          {regions.map(({ region, outlets }) => (
            <div key={region}>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{REGION_NAMES[region]}</h3>
              <div className="flex flex-wrap gap-2">
                {outlets.map((o) => (
                  <Toggle
                    key={o.id}
                    label={o.name}
                    muted={mutes.outlets.includes(o.id)}
                    action={toggleOutletMute.bind(null, o.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Keywords"
        hint={`Hide any story whose headlines mention these words (up to ${MAX_KEYWORDS}).`}
      >
        <form action={addKeywordMute} className="mb-3 flex gap-2">
          <label htmlFor="keyword" className="sr-only">
            Keyword to mute
          </label>
          <input
            id="keyword"
            name="keyword"
            required
            minLength={2}
            maxLength={40}
            placeholder="e.g. Love Island"
            className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white dark:text-black">
            Mute
          </button>
        </form>
        {mutes.keywords.length === 0 ? (
          <p className="text-sm text-muted">No muted keywords.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {mutes.keywords.map((k) => (
              <li key={k}>
                <form action={removeKeywordMute.bind(null, k)}>
                  <button
                    type="submit"
                    aria-label={`Unmute ${k}`}
                    className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent"
                  >
                    {k} <span aria-hidden>×</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {!isEmpty(mutes) && (
        <form action={clearMutes}>
          <button type="submit" className="text-sm text-muted underline hover:text-foreground">
            Unmute everything
          </button>
        </form>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Customise your feed</h1>
      <Suspense fallback={<p className="mb-4 mt-1 h-5" />}>
        <Account />
      </Suspense>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-line bg-surface" />}>
        <SettingsForm />
      </Suspense>
    </>
  );
}
