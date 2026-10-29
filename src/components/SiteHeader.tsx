import Link from "next/link";
import { TOPICS } from "@/config/topics";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Headline<span className="text-accent">Hub</span>
          </Link>
          <nav className="flex gap-4 text-sm" aria-label="Views">
            <Link href="/" className="hover:text-accent">
              Top
            </Link>
            <Link href="/latest" className="hover:text-accent">
              Latest
            </Link>
          </nav>
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 text-sm" aria-label="Topics">
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
