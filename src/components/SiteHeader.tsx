import Link from "next/link";
import { TOPICS } from "@/config/topics";
import { NavLink } from "./NavLink";
import { SearchBox } from "./SearchBox";

/** Path prefixes that belong under a topic tab, e.g. country pages sit under Africa. */
const TOPIC_ALSO: Record<string, string[]> = { africa: ["/country/"] };

const view = "text-subtle hover:text-foreground";
const viewActive = "!text-foreground font-semibold";
const tab = "flex shrink-0 items-center border-b-2 border-transparent text-subtle hover:text-foreground";
const tabActive = "!border-foreground font-semibold !text-foreground";
const pinned = "flex shrink-0 items-center border-b-2 border-transparent font-semibold text-accent";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

const iconLink = "flex size-9 items-center justify-center rounded-lg text-subtle hover:bg-fill hover:text-foreground";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background">
      <div className="mx-auto max-w-3xl px-4 lg:group-has-[[data-wide]]/body:max-w-6xl">
        <div className="flex h-13 items-center gap-7 sm:h-15">
          <Link href="/" className="text-lg font-extrabold tracking-[-0.03em] whitespace-nowrap">
            Headline Hub
          </Link>
          {/* Phones get these from the tab bar at the bottom of the screen. */}
          <nav className="hidden items-center gap-5 text-sm font-medium sm:flex" aria-label="Views">
            <NavLink href="/" className={view} activeClassName={viewActive}>
              Top
            </NavLink>
            <NavLink href="/latest" className={view} activeClassName={viewActive}>
              Latest
            </NavLink>
            <NavLink href="/developing" className={view} activeClassName={viewActive}>
              Developing
            </NavLink>
            <NavLink href="/following" className={view} activeClassName={viewActive}>
              Following
            </NavLink>
          </nav>
          <SearchBox compact className="ml-auto hidden w-full max-w-64 sm:flex" />
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
            <NavLink href="/saved" aria-label="Saved stories" title="Saved stories" className={`hidden sm:flex ${iconLink}`} activeClassName="!text-accent">
              <Icon>
                <path d="M5.5 3.5h9v13l-4.5-3-4.5 3z" />
              </Icon>
            </NavLink>
            <NavLink href="/settings" aria-label="Customise your feed" title="Customise your feed" className={iconLink} activeClassName="!text-accent">
              <Icon>
                <path d="M3 5h9M15 5h2M3 10h3M9 10h8M3 15h9M15 15h2" />
                <circle cx="13.5" cy="5" r="1.5" />
                <circle cx="7.5" cy="10" r="1.5" />
                <circle cx="13.5" cy="15" r="1.5" />
              </Icon>
            </NavLink>
          </div>
        </div>
        <nav className="-mx-4 flex h-10 gap-5 overflow-x-auto px-4 text-sm [scrollbar-width:none]" aria-label="Topics">
          {/* Developing has no tab of its own on phones, so it leads the topic row there. */}
          <NavLink href="/developing" className={`font-medium !text-warn sm:hidden ${tab}`} activeClassName={tabActive}>
            Developing
          </NavLink>
          {TOPICS.map((t) => (
            <NavLink key={t.slug} href={`/topic/${t.slug}`} also={TOPIC_ALSO[t.slug]} className={tab} activeClassName={tabActive}>
              {t.name}
            </NavLink>
          ))}
          <span className="my-3 w-px shrink-0 bg-line" aria-hidden />
          {/* Zimbabwe is our home market, so it's pinned for everyone until pins come from Following. */}
          <NavLink href="/country/zw" className={pinned} activeClassName="!border-foreground">
            Zimbabwe
          </NavLink>
          <NavLink href="/entities" also={["/entity/"]} className={tab} activeClassName={tabActive}>
            People &amp; clubs
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
