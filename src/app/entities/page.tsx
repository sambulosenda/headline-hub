import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { NameChips } from "@/components/NameChips";
import { ENTITIES, KIND_LABELS, type EntityKind } from "@/config/entities";
import { getTrending } from "@/lib/entities";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "People, clubs and companies",
  description: "Follow the people, clubs, companies and places in the news.",
  path: "/entities",
});

async function Trending() {
  await connection();
  const trending = await getTrending(40).catch(() => []);
  if (trending.length === 0) {
    return <p className="text-sm text-muted">Names show here once the ingest worker has run.</p>;
  }
  return <NameChips label="In the news now" names={trending} counts />;
}

export default function EntitiesPage() {
  const kinds = Object.keys(KIND_LABELS) as EntityKind[];
  return (
    <>
      <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em]">People, clubs and companies</h1>
      <p className="mt-1 text-sm text-muted">
        Every name has its own page. Follow the ones you care about to collect them on your Following page.
      </p>
      <section className="mt-6">
        <h2 className="mb-1 border-b-2 border-foreground pb-2.5 text-[0.9375rem] font-bold">In the news now</h2>
        <p className="mb-3 text-[0.8125rem] text-muted">
          Names the most outlets are using in today&apos;s headlines, with the number of outlets. New names appear here
          automatically once three or more outlets use them.
        </p>
        <Suspense fallback={<div className="h-16 animate-pulse rounded-md bg-fill" />}>
          <Trending />
        </Suspense>
      </section>
      {kinds.map((kind) => (
        <section key={kind} className="mt-6">
          <h2 className="mb-3 border-b-2 border-foreground pb-2.5 text-[0.9375rem] font-bold">{KIND_LABELS[kind]}</h2>
          <NameChips label={KIND_LABELS[kind]} names={ENTITIES.filter((e) => e.kind === kind)} />
        </section>
      ))}
    </>
  );
}
