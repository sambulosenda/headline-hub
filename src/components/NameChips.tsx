import Link from "next/link";

/** A row of links to name pages, e.g. under a headline or atop the front page. */
export function NameChips({
  names,
  label,
  counts = false,
  className = "",
}: {
  names: { slug: string; name: string; outlets?: number }[];
  label: string;
  counts?: boolean;
  className?: string;
}) {
  if (names.length === 0) return null;
  return (
    <nav aria-label={label} className={`flex flex-wrap gap-1.5 text-xs ${className}`}>
      {names.map((n) => (
        <Link
          key={n.slug}
          href={`/entity/${n.slug}`}
          className="rounded-full border border-line px-2.5 py-0.5 text-muted hover:border-accent hover:text-accent"
        >
          {n.name}
          {counts && n.outlets ? <span className="ml-1 tabular-nums opacity-70">{n.outlets}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
