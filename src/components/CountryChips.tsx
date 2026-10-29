import Link from "next/link";
import { COUNTRIES } from "@/config/countries";

/** Links to each country page; the current one is highlighted. */
export function CountryChips({ current }: { current?: string }) {
  return (
    <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Countries">
      {COUNTRIES.map((c) => (
        <Link
          key={c.code}
          href={`/country/${c.code}`}
          aria-current={c.code === current ? "page" : undefined}
          className={`rounded-full border px-3 py-1 ${
            c.code === current ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-accent hover:text-accent"
          }`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
