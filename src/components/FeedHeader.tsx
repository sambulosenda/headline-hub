import Link from "next/link";

/** Title, an optional line under it, and the Top / Latest switch for a topic or country page. */
export function FeedHeader({
  title,
  pathname,
  view,
  children,
}: {
  title: string;
  pathname: string;
  view: "top" | "latest";
  /** Shown between the title and the switch: a description, a row of places. */
  children?: React.ReactNode;
}) {
  const tab = (active: boolean) =>
    `-mb-px border-b-2 pb-2 ${active ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted hover:text-foreground"}`;
  return (
    <header className="mb-4">
      <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em]">{title}</h1>
      {children}
      <nav className="mt-3 flex gap-5 border-b border-line text-sm" aria-label="View">
        <Link href={pathname} aria-current={view === "top" ? "page" : undefined} className={tab(view === "top")}>
          Top
        </Link>
        <Link
          href={`${pathname}?view=latest`}
          aria-current={view === "latest" ? "page" : undefined}
          className={tab(view === "latest")}
        >
          Latest
        </Link>
      </nav>
    </header>
  );
}
