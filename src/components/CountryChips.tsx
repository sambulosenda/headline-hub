import Link from "next/link";
import { COUNTRIES } from "@/config/countries";

/** One scrolling line of links to each country page; the current one is set in bold. */
export function CountryChips({ current }: { current?: string }) {
  return (
    <nav className="-mx-4 flex gap-4 overflow-x-auto px-4 text-sm [scrollbar-width:none]" aria-label="Countries">
      {COUNTRIES.map((c) => (
        <Link
          key={c.code}
          href={`/country/${c.code}`}
          aria-current={c.code === current ? "page" : undefined}
          className={`flex min-h-9 shrink-0 items-center ${
            c.code === current ? "font-semibold text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
