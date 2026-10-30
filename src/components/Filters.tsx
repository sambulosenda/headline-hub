import Link from "next/link";
import { HOUR_OPTIONS, REGION_OPTIONS, withParam, type SearchParams } from "@/lib/filters";
import type { FeedFilters } from "@/lib/queries";

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`flex min-h-9 shrink-0 items-center text-sm ${active ? "font-semibold text-foreground" : "text-muted hover:text-foreground"}`}
    >
      {children}
    </Link>
  );
}

export function Filters({
  pathname,
  params,
  filters,
  showHours = true,
}: {
  pathname: string;
  params: SearchParams;
  filters: FeedFilters;
  showHours?: boolean;
}) {
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Filters">
      {showHours &&
        HOUR_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            href={withParam(pathname, params, "hours", o.value === 24 ? undefined : String(o.value))}
            active={filters.hours === o.value}
          >
            {o.label}
          </Chip>
        ))}
      {showHours && <span className="my-2 w-px shrink-0 bg-line" aria-hidden />}
      {REGION_OPTIONS.map((o) => (
        <Chip key={o.label} href={withParam(pathname, params, "region", o.value)} active={filters.region === o.value}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
