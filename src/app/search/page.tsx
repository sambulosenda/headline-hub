import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FeedSkeleton } from "@/components/Feeds";
import { SearchBox } from "@/components/SearchBox";
import { StoryCard } from "@/components/StoryCard";
import { parseSearch, searchHref, searchStories, WITHIN_OPTIONS } from "@/lib/search";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const { q } = parseSearch(await searchParams);
  // Result pages change by the minute; keep them out of search engines.
  return { title: q ? `"${q}"` : "Search", robots: { index: false, follow: true } };
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

async function Results({ searchParams }: PageProps<"/search">) {
  const input = parseSearch(await searchParams);
  if (!input.q) {
    return <Notice title="Search every headline" body='Try a name, a place or a phrase in quotes, like "interest rates".' />;
  }

  // Results must be fresh per request; called outside the try so its prerender signal isn't swallowed.
  await connection();
  let results;
  try {
    results = (await searchStories(input)).filter((s) => s.coverage.length > 0);
  } catch (err) {
    console.error(err);
    return <Notice title="Search isn't working right now" body="Check DATABASE_URL and that migrations have run." />;
  }

  const chip = (active: boolean) =>
    `rounded-md px-2.5 py-1 ${active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface hover:text-foreground"}`;
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 text-sm" aria-label="Time window">
        {WITHIN_OPTIONS.map((o) => (
          <Link key={o.value} href={searchHref(input, o.value)} className={chip(o.value === input.within)}>
            {o.label}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted" role="status">
        {results.length === 0
          ? `No stories match "${input.q}".`
          : `${results.length}${results.length === 30 ? "+" : ""} ${results.length === 1 ? "story" : "stories"} for "${input.q}"`}
      </p>
      {results.length === 0 ? (
        input.within !== "all" && (
          <Link href={searchHref(input, "all")} className="text-sm text-accent hover:underline">
            Search any time instead
          </Link>
        )
      ) : (
        results.map((s) => <StoryCard key={s.id} story={s} />)
      )}
    </div>
  );
}

async function SearchForm({ searchParams }: PageProps<"/search">) {
  const { q, within } = parseSearch(await searchParams);
  return <SearchBox defaultValue={q} within={within} autoFocus={!q} className="mb-4" />;
}

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <>
      <h1 className="mb-3 text-2xl font-bold">Search</h1>
      <Suspense fallback={<SearchBox className="mb-4" />}>
        <SearchForm {...props} />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <Results {...props} />
      </Suspense>
    </>
  );
}
