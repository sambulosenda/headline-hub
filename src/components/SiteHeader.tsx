import Link from "next/link";
import { TOPICS } from "@/config/topics";
import { SearchBox } from "./SearchBox";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Headline<span className="text-accent">Hub</span>
          </Link>
          <SearchBox compact className="ml-auto w-full max-w-56" />
          <nav className="flex shrink-0 gap-4 text-sm" aria-label="Views">
            <Link href="/" className="hover:text-accent">
              Top
            </Link>
            <Link href="/latest" className="hover:text-accent">
              Latest
            </Link>
            <Link href="/developing" className="hidden hover:text-accent sm:inline">
              Developing
            </Link>
          </nav>
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 text-sm" aria-label="Topics">
          {/* No room for this beside the search box on phones, so it leads the topic row there. */}
          <Link
            href="/developing"
            className="shrink-0 rounded-md px-2.5 py-1 font-medium text-warn hover:bg-surface sm:hidden"
          >
            Developing
          </Link>
          {TOPICS.map((t) => (
            <Link
              key={t.slug}
              href={`/topic/${t.slug}`}
              className="shrink-0 rounded-md px-2.5 py-1 text-muted hover:bg-surface hover:text-foreground"
            >
              {t.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
