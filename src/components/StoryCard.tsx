import { explainScore } from "@/lib/ranking";
import { outboundUrl } from "@/lib/normalize";
import Link from "next/link";
import { timeAgo } from "@/lib/filters";
import { storyPath } from "@/lib/slug";
import type { StoryWithCoverage } from "@/lib/queries";
import { findTopic } from "@/config/topics";
import { COUNTRIES } from "@/config/countries";
import { toggleOutletMute, toggleTopicMute } from "@/app/settings/actions";
import { coverageStrip, originCounts, outletOrigin } from "@/lib/coverage";
import { CoverageStrip } from "./CoverageStrip";
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

/** The place a story is about if it has one, otherwise its first topic. */
function storyLabel(story: StoryWithCoverage): string | undefined {
  const country = COUNTRIES.find((c) => story.countries.includes(c.code));
  return country?.name ?? (story.topics[0] && findTopic(story.topics[0])?.name);
}

export function StoryCard({
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
  const developing = story.recentOutlets >= 2;
  // Local outlets lead the names, so a Zimbabwe story credits Zimbabwean papers first.
  const local = story.coverage.filter((c) => outletOrigin(c, story) === "local");
  const names = outletNames([...local, ...story.coverage]);
  const shown = names.slice(0, NAMED_OUTLETS);
  const count = Math.max(story.outletCount, names.length);
  const more = count - shown.length;
  const path = storyPath(story.id, story.title);
  const bars = coverageStrip(story);
  const counts = originCounts(bars);
  const label = storyLabel(story);
  const age = timeAgo(story.lastSeenAt);

  return (
    <article className="py-4">
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] text-muted">
        {developing && <span className="mr-1 font-semibold text-warn">Developing</span>}
        {label && (
          <>
            <span>{label}</span>
            <span aria-hidden>·</span>
          </>
        )}
        <span>{age === "just now" ? age : `${age} ago`}</span>
      </p>
      <h2 className="mt-1 text-[1.0625rem] leading-[1.3] font-semibold tracking-[-0.01em] text-balance">
        <a href={outboundUrl(lead.url)} data-outbound="1" className="hover:underline hover:decoration-1 hover:underline-offset-3" target="_blank" rel="noopener">
          {story.title}
        </a>
      </h2>
      <p className="mt-1 text-[0.8125rem] text-subtle">
        {shown.join(", ")}
        {more > 0 && ` and ${more} more`}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        {/* The strip and count are the way into full coverage. */}
        <Link
          href={path}
          className="group flex min-w-0 flex-wrap items-center gap-x-2 text-[0.8125rem] text-subtle"
          title={`${counts.local} local, ${counts.regional} regional, ${counts.international} international`}
        >
          <CoverageStrip bars={bars} />
          <span className="group-hover:underline group-hover:underline-offset-2">
            {count} {count === 1 ? "outlet" : "outlets"}
          </span>
          {story.recentOutlets > 0 && <span className="text-warn">+{story.recentOutlets} in the last hour</span>}
        </Link>
        <div className="-my-2 -mr-2 ml-auto flex shrink-0 items-center">
          <SaveButton storyId={story.id} saved={saved} iconOnly />
          <StoryMenu story={story} lead={lead} mutedTopics={mutedTopics} path={path} />
        </div>
      </div>
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
