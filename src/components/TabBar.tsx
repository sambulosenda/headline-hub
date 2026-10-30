import { NavLink } from "./NavLink";

const tab = "flex min-h-11 flex-col items-center justify-center gap-0.5 pt-1 text-[0.6875rem] font-medium text-muted";
const active = "!text-foreground";

const ICONS = {
  top: <path d="M3.5 9 10 3.5 16.5 9v7.5h-4.5v-5h-4v5H3.5z" />,
  latest: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.5V10l2.5 1.8" />
    </>
  ),
  following: <path d="M10 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7L3.2 8l4.7-.7z" />,
  saved: <path d="M5.5 3.5h9v13l-4.5-3-4.5 3z" />,
  search: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.2 13.2 17 17" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

/** Phone navigation, kept in thumb reach. Wider screens use the header instead. */
export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-line bg-background pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden"
    >
      <NavLink href="/" also={["/topic/", "/country/"]} className={tab} activeClassName={active}>
        <Icon name="top" />
        Top
      </NavLink>
      <NavLink href="/latest" className={tab} activeClassName={active}>
        <Icon name="latest" />
        Latest
      </NavLink>
      <NavLink href="/following" also={["/entity/"]} className={tab} activeClassName={active}>
        <Icon name="following" />
        Following
      </NavLink>
      <NavLink href="/saved" className={tab} activeClassName={active}>
        <Icon name="saved" />
        Saved
      </NavLink>
      <NavLink href="/search" className={tab} activeClassName={active}>
        <Icon name="search" />
        Search
      </NavLink>
    </nav>
  );
}
