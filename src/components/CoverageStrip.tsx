import type { StripBar } from "@/lib/coverage";

/** Most bars a strip draws; the count beside it carries the rest. */
const MAX_BARS = 30;

const COLOUR = {
  local: "bg-accent",
  regional: "bg-cov-regional",
  international: "bg-cov-international",
} as const;

/**
 * One thin bar per outlet: green from the story's own country, mid grey from the same region,
 * light grey from everywhere else. Decorative; the outlet count next to it says the same in words.
 */
export function CoverageStrip({ bars }: { bars: StripBar[] }) {
  return (
    <span className="inline-flex h-[11px] shrink-0 items-end gap-[1.5px]" aria-hidden>
      {bars.slice(0, MAX_BARS).map((b, i) => (
        <i key={i} className={`block h-full w-[2px] ${COLOUR[b.origin]}`} />
      ))}
    </span>
  );
}
