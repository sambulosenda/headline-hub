import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EntityButtons } from "@/components/EntityButtons";
import { FeedSkeleton, LatestHeadlines, TopStories } from "@/components/Feeds";
import { ENTITIES, KIND_LABELS } from "@/config/entities";
import { resolveEntity } from "@/lib/entities";
import { getMutes } from "@/lib/mutes-server";

export function generateStaticParams() {
  return ENTITIES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/entity/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listed = ENTITIES.find((e) => e.slug === slug);
  return { title: listed ? `${listed.name} news` : "In the news" };
}

async function EntityFeed({ params, searchParams }: PageProps<"/entity/[slug]">) {
  const entity = await resolveEntity((await params).slug);
  if (!entity) notFound();
  const mutes = await getMutes();
  const view = (await searchParams).view === "latest" ? "latest" : "top";
  const pathname = `/entity/${entity.slug}`;
  const tab = (active: boolean) =>
    `border-b-2 pb-1 ${active ? "border-accent text-foreground" : "border-transparent text-muted"}`;
  const empty = {
    title: `Nothing on ${entity.name} right now`,
    body: "Try a longer time window, or follow to see new stories on your Following page.",
  };
  const feed = { pathname, searchParams, mentions: entity.terms, entity: entity.slug, empty };

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        <Link href="/entities" className="hover:text-accent">
          {entity.kind === "auto" ? "In the news" : KIND_LABELS[entity.kind]}
        </Link>
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{entity.name}</h1>
        <EntityButtons entity={entity} mutes={mutes} />
      </div>
      <p className="mb-4 mt-1 text-sm text-muted">
        Stories whose headline or summary mentions {entity.terms.length > 1 ? entity.terms.join(", ") : entity.name}.
        {entity.kind === "auto" && " Spotted automatically because several outlets are using the name."}
      </p>
      <nav className="mb-4 flex gap-4 text-sm" aria-label="View">
        <Link href={pathname} className={tab(view === "top")}>
          Top
        </Link>
        <Link href={`${pathname}?view=latest`} className={tab(view === "latest")}>
          Latest
        </Link>
      </nav>
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
