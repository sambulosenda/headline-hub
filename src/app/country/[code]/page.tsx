import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FeedHeader } from "@/components/FeedHeader";
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

  return (
    <>
      <FeedHeader title={country.name} pathname={pathname} view={view}>
        <p className="mt-1 text-sm text-subtle">
          {country.name}&apos;s own newsrooms first, then what the rest of the world is saying.
        </p>
        <div className="mt-2">
          <CountryChips current={country.code} />
        </div>
      </FeedHeader>
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
