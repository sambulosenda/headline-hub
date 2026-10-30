import { explainScore } from "@/lib/ranking";
import { outboundUrl } from "@/lib/normalize";
import Link from "next/link";
import { timeAgo } from "@/lib/filters";
import { storyPath } from "@/lib/slug";
import type { StoryWithCoverage } from "@/lib/queries";
import { findTopic } from "@/config/topics";
import { COUNTRIES } from "@/config/countries";
import { toggleOutletMute, toggleTopicMute } from "@/app/settings/actions";
import { coverageStrip, originCounts, outletOrigin, storyImage } from "@/lib/coverage";
import { CoverageStrip } from "./CoverageStrip";
import { StoryImage } from "./StoryImage";
import { SaveButton } from "./SaveButton";

/** How many outlet names a row spells out before "and N more". */
const NAMED_OUTLETS = 3;

/** Distinct outlet names in coverage order (best outlet first). */
export function outletNames(coverage: { outletName: string }[]): string[] {
  return [...new Set(coverage.map((c) => c.outletName))];
}

/** Stories as rows divided by rules: no boxes, so a phone screen holds several at once. */
export function StoryList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-line">{children}</div>;
}

/**
 * The place a story is about if it has one, otherwise its first topic. On a country's
 * own page that country goes without saying, so the label falls through to the topic.
 */
function storyLabel(story: StoryWithCoverage, pageCountry?: string): string | undefined {
  const country = COUNTRIES.find((c) => c.code !== pageCountry && story.countries.includes(c.code));
  const topics = pageCountry ? story.topics.filter((t) => t !== "africa") : story.topics;
  return country?.name ?? (topics[0] && findTopic(topics[0])?.name);
}

/** What every story presentation shows: label, outlets (local first) and coverage. */
function storyParts(story: StoryWithCoverage, pageCountry?: string) {
  // Local outlets lead the names, so a Zimbabwe story credits Zimbabwean papers first.
  const local = story.coverage.filter((c) => outletOrigin(c, story) === "local");
  const names = outletNames([...local, ...story.coverage]);
  const shown = names.slice(0, NAMED_OUTLETS);
  const count = Math.max(story.outletCount, names.length);
  const more = count - shown.length;
  const bars = coverageStrip(story);
  const age = timeAgo(story.lastSeenAt);
  return {
    developing: story.recentOutlets >= 2,
    label: storyLabel(story, pageCountry),
    age: age === "just now" ? age : `${age} ago`,
    outlets: `${shown.join(", ")}${more > 0 ? ` and ${more} more` : ""}`,
    count,
    bars,
    counts: originCounts(bars),
    path: storyPath(story.id, story.title),
  };
}

type Parts = ReturnType<typeof storyParts>;

function MetaLine({ parts }: { parts: Parts }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] text-muted">
      {parts.developing && <span className="mr-1 font-semibold text-warn">Developing</span>}
      {parts.label && (
        <>
          <span>{parts.label}</span>
          <span aria-hidden>·</span>
        </>
      )}
      <span>{parts.age}</span>
    </p>
  );
}

/** The strip and count are the way into full coverage. */
function CoverageLink({ story, parts }: { story: StoryWithCoverage; parts: Parts }) {
  const { counts } = parts;
  return (
    <Link
      href={parts.path}
      className="group flex min-w-0 flex-wrap items-center gap-x-2 text-[0.8125rem] text-subtle"
      title={`${counts.local} local, ${counts.regional} regional, ${counts.international} international`}
    >
      <CoverageStrip bars={parts.bars} />
      <span className="group-hover:underline group-hover:underline-offset-2">
        {parts.count} {parts.count === 1 ? "outlet" : "outlets"}
      </span>
      {story.recentOutlets > 0 && <span className="text-warn">+{story.recentOutlets} in the last hour</span>}
    </Link>
  );
}

export function StoryCard({
  story,
  mutedTopics = [],
  saved = false,
  pageCountry,
}: {
  story: StoryWithCoverage;
  mutedTopics?: string[];
  saved?: boolean;
  /** The country page this card sits on, if any. */
  pageCountry?: string;
}) {
  const [lead] = story.coverage;
  if (!lead) return null;
  const parts = storyParts(story, pageCountry);

  return (
    <article className="py-4">
      <MetaLine parts={parts} />
      <h2 className="mt-1 text-[1.0625rem] leading-[1.3] font-semibold tracking-[-0.01em] text-balance">
        <a href={outboundUrl(lead.url)} data-outbound="1" className="hover:underline hover:decoration-1 hover:underline-offset-3" target="_blank" rel="noopener">
          {story.title}
        </a>
      </h2>
      <p className="mt-1 text-[0.8125rem] text-subtle">{parts.outlets}</p>
      <div className="mt-1.5 flex items-center gap-3">
        <CoverageLink story={story} parts={parts} />
        <div className="-my-2 -mr-2 ml-auto flex shrink-0 items-center">
          <SaveButton storyId={story.id} saved={saved} iconOnly />
          <StoryMenu story={story} lead={lead} mutedTopics={mutedTopics} path={parts.path} />
        </div>
      </div>
    </article>
  );
}

/** How many other outlets' headlines the lead story shows under its own. */
const LEAD_FRAMINGS = 4;
/** Desktop columns for the other headlines, so three fill the width instead of leaving a gap. */
const FRAMING_COLS = ["", "", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-2 lg:grid-cols-4"];

/**
 * The top story, given room: a large headline, the best outlet's summary, and other outlets'
 * headlines side by side, so the range of coverage shows before anyone clicks.
 */
export function LeadStory({
  story,
  mutedTopics = [],
  saved = false,
}: {
  story: StoryWithCoverage;
  mutedTopics?: string[];
  saved?: boolean;
}) {
  const [lead] = story.coverage;
  if (!lead) return null;
  const parts = storyParts(story);
  const summary = story.coverage.find((c) => c.summary)?.summary;
  const seen = new Set([story.title.toLowerCase()]);
  const framings = story.coverage
    .filter((c) => c.outletId !== lead.outletId && !seen.has(c.title.toLowerCase()) && seen.add(c.title.toLowerCase()))
    .slice(0, LEAD_FRAMINGS);
  const image = storyImage(story);

  return (
    <article className="pb-6">
      <div className={image ? "grid gap-x-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,40%)]" : undefined}>
        {image && <StoryImage {...image} priority className="mb-4 sm:order-last sm:mb-0" />}
        <div className="min-w-0">
          <MetaLine parts={parts} />
          <h2 className="mt-2 max-w-[20ch] text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-balance sm:text-[2.625rem] sm:leading-[1.05]">
            <a href={outboundUrl(lead.url)} data-outbound="1" className="hover:underline hover:decoration-2 hover:underline-offset-4" target="_blank" rel="noopener">
              {story.title}
            </a>
          </h2>
          {summary && <p className="mt-3 line-clamp-3 max-w-[60ch] text-[1.0625rem] leading-normal text-subtle">{summary}</p>}
          <p className="mt-3 text-sm text-subtle">{parts.outlets}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <CoverageLink story={story} parts={parts} />
            <div className="-my-2 -mr-2 ml-auto flex shrink-0 items-center">
              <SaveButton storyId={story.id} saved={saved} iconOnly />
              <StoryMenu story={story} lead={lead} mutedTopics={mutedTopics} path={parts.path} />
            </div>
          </div>
        </div>
      </div>
      {framings.length > 0 && (
        <ul className={`mt-4 grid border-t border-line sm:gap-x-6 ${FRAMING_COLS[framings.length]}`} aria-label="Other outlets' headlines">
          {framings.map((c) => (
            <li key={c.id} className="border-b border-line py-3 sm:border-b-0 max-sm:last:border-b-0">
              <a href={outboundUrl(c.url)} data-outbound="1" className="group grid gap-1 text-sm leading-snug font-medium" target="_blank" rel="noopener">
                <span className="text-[0.8125rem] font-semibold text-muted">{c.outletName}</span>
                <span className="group-hover:underline">{c.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** The ⋯ menu: everything a reader needs now and then, kept off the row itself. */
function StoryMenu({
  story,
  lead,
  mutedTopics,
  path,
}: {
  story: StoryWithCoverage;
  lead: StoryWithCoverage["coverage"][number];
  mutedTopics: string[];
  path: string;
}) {
  const item = "block w-full rounded-md px-3 py-2 text-left hover:bg-fill";
  return (
    <details className="group relative">
      <summary
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg text-muted hover:bg-fill hover:text-foreground sm:size-8 [&::-webkit-details-marker]:hidden"
        aria-label="More options"
        title="More options"
      >
        <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor" aria-hidden>
          <circle cx="4.5" cy="10" r="1.3" />
          <circle cx="10" cy="10" r="1.3" />
          <circle cx="15.5" cy="10" r="1.3" />
        </svg>
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-line bg-surface p-1.5 text-sm shadow-lg">
        <Link href={path} className={item}>
          Full coverage &amp; share
        </Link>
        <form action={toggleOutletMute.bind(null, lead.outletId)}>
          <button type="submit" className={item}>
            Mute {lead.outletName}
          </button>
        </form>
        {story.topics.map((slug) => {
          const topic = findTopic(slug);
          return (
            topic && (
              <form key={slug} action={toggleTopicMute.bind(null, slug)}>
                <button type="submit" className={item}>
                  {mutedTopics.includes(slug) ? "Unmute" : "Mute"} {topic.name}
                </button>
              </form>
            )
          );
        })}
        <div className="mt-1 border-t border-line px-3 pb-1 pt-2 text-muted">
          <p className="font-medium text-foreground">Why this is here</p>
          <ul className="mt-1 list-disc pl-4">
            {explainScore(story).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
