import Link from "next/link";

/** A row of links to name pages, e.g. under a headline or atop the front page. */
export function NameChips({
  names,
  label,
  counts = false,
  scroll = false,
  className = "",
}: {
  names: { slug: string; name: string; outlets?: number }[];
  label: string;
  counts?: boolean;
  /** One sideways-scrolling row on phones instead of wrapping. */
  scroll?: boolean;
  className?: string;
}) {
  if (names.length === 0) return null;
  return (
    <nav
      aria-label={label}
      className={`flex gap-x-4 gap-y-1 text-sm ${scroll ? "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" : "flex-wrap"} ${className}`}
    >
      {names.map((n) => (
        <Link
          key={n.slug}
          href={`/entity/${n.slug}`}
          className={`${scroll ? "shrink-0 whitespace-nowrap" : ""} py-1 underline decoration-line-strong underline-offset-4 hover:decoration-foreground`}
        >
          {n.name}
          {counts && n.outlets ? <span className="ml-1.5 font-mono text-xs tabular-nums text-muted">{n.outlets}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
