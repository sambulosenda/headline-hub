import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EntityButtons } from "@/components/EntityButtons";
import { FeedHeader } from "@/components/FeedHeader";
import { FeedSkeleton, LatestHeadlines, TopStories } from "@/components/Feeds";
import { MentionsChart } from "@/components/MentionsChart";
import { ENTITIES, KIND_LABELS } from "@/config/entities";
import { resolveEntity, type EntityRef } from "@/lib/entities";
import { getMutes } from "@/lib/mutes-server";
import { getMentionStats } from "@/lib/queries";

export function generateStaticParams() {
  return ENTITIES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/entity/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listed = ENTITIES.find((e) => e.slug === slug);
  return { title: listed ? `${listed.name} news` : "In the news" };
}

/** A week of mentions beside the outlets writing about them most. */
async function Coverage({ entity }: { entity: EntityRef }) {
  await connection();
  const stats = await getMentionStats(entity.terms).catch((err) => {
    console.error(err);
    return null;
  });
  if (!stats || stats.outlets.length === 0) return null;
  return (
    <div className="mb-4 grid gap-6 sm:grid-cols-2 sm:gap-10">
      <MentionsChart days={stats.days} />
      <section aria-labelledby="who-covers">
        <h2 id="who-covers" className="text-[0.8125rem] text-subtle">
          Writing about {entity.name} most
        </h2>
        <ol className="mt-2 text-sm">
          {stats.outlets.map((o) => (
            <li key={o.id} className="flex justify-between gap-3 border-b border-line py-1.5">
              <span className="truncate">{o.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted">{o.count}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

async function EntityFeed({ params, searchParams }: PageProps<"/entity/[slug]">) {
  const entity = await resolveEntity((await params).slug);
  if (!entity) notFound();
  const mutes = await getMutes();
  const view = (await searchParams).view === "latest" ? "latest" : "top";
  const pathname = `/entity/${entity.slug}`;
  const empty = {
    title: `Nothing on ${entity.name} right now`,
    body: "Try a longer time window, or follow to see new stories on your Following page.",
  };
  const feed = { pathname, searchParams, mentions: entity.terms, entity: entity.slug, empty };

  return (
    <>
      <p className="mb-1 text-[0.8125rem] text-muted">
        <Link href="/entities" className="hover:text-foreground">
          {entity.kind === "auto" ? "In the news" : KIND_LABELS[entity.kind]}
        </Link>
      </p>
      <FeedHeader title={entity.name} pathname={pathname} view={view}>
        <p className="mt-1 text-sm text-subtle">
          Stories whose headline or summary mentions {entity.terms.length > 1 ? entity.terms.join(", ") : entity.name}.
          {entity.kind === "auto" && " Spotted automatically because several outlets are using the name."}
        </p>
        <div className="mt-3">
          <EntityButtons entity={entity} mutes={mutes} />
        </div>
        <Suspense fallback={null}>
          <div className="mt-5">
            <Coverage entity={entity} />
          </div>
        </Suspense>
      </FeedHeader>
      {view === "latest" ? <LatestHeadlines {...feed} /> : <TopStories {...feed} />}
    </>
  );
}

export default function EntityPage(props: PageProps<"/entity/[slug]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <EntityFeed {...props} />
    </Suspense>
  );
}
