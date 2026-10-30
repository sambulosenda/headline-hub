import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FeedSkeleton, TopStories } from "@/components/Feeds";
import { NameChips } from "@/components/NameChips";
import { getTrending } from "@/lib/entities";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, SITE } from "@/lib/site";

export const metadata: Metadata = {
  ...pageMetadata({ title: SITE.name, description: SITE.description, path: "/" }),
  title: { absolute: `${SITE.name}: every outlet's take on today's news` },
};

/** Lets search engines show a search box for the site and name it correctly. */
function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

async function InTheNews() {
  await connection();
  const names = await getTrending(12).catch(() => []);
  if (names.length === 0) return null;
  return (
    // One sideways-scrolling row on phones, so the stories start above the fold.
    // Wide screens show these in the side column instead.
    <div className="-mx-4 mb-5 flex items-start gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:hidden">
      <Link href="/entities" className="shrink-0 pt-0.5 text-xs font-medium text-muted hover:text-foreground">
        In the news
      </Link>
      <NameChips scroll label="Names in the news" names={names} />
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      {/* The lead story's headline is the visual top of the page. */}
      <h1 className="sr-only">Top stories</h1>
      <script
        type="application/ld+json"
        // Escape "<" so no value can close the script tag early.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()).replace(/</g, "\\u003c") }}
      />
      <Suspense fallback={null}>
        <InTheNews />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <TopStories pathname="/" searchParams={searchParams} front />
      </Suspense>
    </>
  );
}
