import Link from "next/link";
import { TOPICS } from "@/config/topics";
import { NavLink } from "./NavLink";
import { SearchBox } from "./SearchBox";

/** Path prefixes that belong under a topic tab, e.g. country pages sit under Africa. */
const TOPIC_ALSO: Record<string, string[]> = { africa: ["/country/"] };

const view = "hover:text-accent";
const viewActive = "font-semibold text-accent";
const tab = "shrink-0 rounded-md px-2.5 py-1 text-muted hover:bg-surface hover:text-foreground";
const tabActive = "bg-surface font-medium !text-foreground shadow-[inset_0_-2px_0_var(--accent)]";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 lg:group-has-[[data-wide]]/body:max-w-6xl">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Headline<span className="text-accent">Hub</span>
          </Link>
          <SearchBox compact className="ml-auto hidden w-full max-w-56 sm:flex" />
          <nav className="flex shrink-0 items-center gap-4 text-sm" aria-label="Views">
            <NavLink href="/" className={view} activeClassName={viewActive}>
              Top
            </NavLink>
            <NavLink href="/latest" className={view} activeClassName={viewActive}>
              Latest
            </NavLink>
            <NavLink href="/developing" className={`hidden sm:inline ${view}`} activeClassName={viewActive}>
              Developing
            </NavLink>
            <NavLink href="/following" className={`hidden sm:inline ${view}`} activeClassName={viewActive}>
              Following
            </NavLink>
            {/* No room for the search box on phones: an icon opens the search page, which focuses its own box. */}
            <NavLink href="/search" aria-label="Search" title="Search" className={`sm:hidden ${view}`} activeClassName="text-accent">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <circle cx="8.5" cy="8.5" r="5" />
                <path d="M12.5 12.5l4 4" strokeLinecap="round" />
              </svg>
            </NavLink>
            <NavLink href="/saved" aria-label="Saved stories" title="Saved stories" className={view} activeClassName="text-accent">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M5.5 3.5h9v13l-4.5-3-4.5 3z" strokeLinejoin="round" />
              </svg>
            </NavLink>
            <NavLink href="/settings" aria-label="Customise your feed" title="Customise your feed" className={view} activeClassName="text-accent">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M3 5h9M15 5h2M3 10h3M9 10h8M3 15h9M15 15h2" strokeLinecap="round" />
                <circle cx="13.5" cy="5" r="1.5" />
                <circle cx="7.5" cy="10" r="1.5" />
                <circle cx="13.5" cy="15" r="1.5" />
              </svg>
            </NavLink>
          </nav>
        </div>
        <div className="relative">
          <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 text-sm" aria-label="Topics">
            {/* No room for these beside the views on phones, so they lead the topic row there. */}
            <NavLink href="/developing" className={`font-medium !text-warn sm:hidden ${tab}`} activeClassName={tabActive}>
              Developing
            </NavLink>
            <NavLink href="/following" className={`sm:hidden ${tab}`} activeClassName={tabActive}>
              Following
            </NavLink>
            {TOPICS.map((t) => (
              <NavLink
                key={t.slug}
                href={`/topic/${t.slug}`}
                also={TOPIC_ALSO[t.slug]}
                className={tab}
                activeClassName={tabActive}
              >
                {t.name}
              </NavLink>
            ))}
            <NavLink href="/entities" also={["/entity/"]} className={tab} activeClassName={tabActive}>
              People &amp; clubs
            </NavLink>
          </nav>
          {/* Fades the row's edge on phones so it's clear more tabs scroll into view. */}
          <div
            className="pointer-events-none absolute inset-y-0 -right-4 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
            aria-hidden
          />
        </div>
      </div>
    </header>
  );
}
