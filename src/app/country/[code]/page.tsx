import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CountryChips } from "@/components/CountryChips";
import { FeedSkeleton, LatestHeadlines, TopStories } from "@/components/Feeds";
import { COUNTRIES, findCountry } from "@/config/countries";

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ code: c.code }));
}

export async function generateMetadata({ params }: PageProps<"/country/[code]">): Promise<Metadata> {
  const country = findCountry((await params).code);
  return { title: country ? `${country.name} news` : "Country" };
}

async function CountryFeed({ params, searchParams }: PageProps<"/country/[code]">) {
  const country = findCountry((await params).code);
  if (!country) notFound();
  const view = (await searchParams).view === "latest" ? "latest" : "top";
  const pathname = `/country/${country.code}`;
  const tab = (active: boolean) =>
    `border-b-2 pb-1 ${active ? "border-accent text-foreground" : "border-transparent text-muted"}`;

  return (
    <>
      <h1 className="text-2xl font-bold">{country.name}</h1>
      <p className="mb-3 mt-1 text-sm text-muted">
        From {country.name}&apos;s own outlets, and any outlet whose headline or summary mentions it.
      </p>
      <CountryChips current={country.code} />
      <nav className="mb-4 flex gap-4 text-sm" aria-label="View">
        <Link href={pathname} className={tab(view === "top")}>
          Top
        </Link>
        <Link href={`${pathname}?view=latest`} className={tab(view === "latest")}>
          Latest
        </Link>
      </nav>
      {view === "latest" ? (
        <LatestHeadlines pathname={pathname} searchParams={searchParams} country={country.code} />
      ) : (
        <TopStories pathname={pathname} searchParams={searchParams} country={country.code} />
      )}
    </>
  );
}

export default function CountryPage(props: PageProps<"/country/[code]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <CountryFeed {...props} />
    </Suspense>
  );
}
