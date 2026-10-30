import { explainScore } from "@/lib/ranking";
import { outboundUrl } from "@/lib/normalize";
import Link from "next/link";
import { timeAgo } from "@/lib/filters";
import { storyPath } from "@/lib/slug";
import type { StoryWithCoverage } from "@/lib/queries";
import { findTopic } from "@/config/topics";
import { toggleOutletMute, toggleTopicMute } from "@/app/settings/actions";
import { entitiesIn } from "@/lib/names";
import { NameChips } from "./NameChips";
import { SaveButton } from "./SaveButton";

/** How many outlet names a card spells out before "+N". */
const NAMED_OUTLETS = 3;

/** Distinct outlet names in coverage order (best outlet first). */
export function outletNames(coverage: { outletName: string }[]): string[] {
  return [...new Set(coverage.map((c) => c.outletName))];
}

/** The bordered, divided list that story cards sit in. */
export function StoryList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-line rounded-xl border border-line bg-surface">{children}</div>;
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
  const names = outletNames(story.coverage);
  const shown = names.slice(0, NAMED_OUTLETS);
  const more = Math.max(story.outletCount, names.length) - shown.length;
  const path = storyPath(story.id, story.title);

  return (
    <article className="px-4 py-3">
      <h2 className="font-semibold leading-snug text-balance sm:text-[1.0625rem]">
        <a href={outboundUrl(lead.url)} data-outbound="1" className="hover:underline" target="_blank" rel="noopener">
          {story.title}
        </a>
      </h2>
      {/* Actions share the outlet line so the headline gets the card's full width on phones. */}
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-sm text-muted">
          {developing && <span className="mr-1.5 font-medium text-warn">Developing ·</span>}
          {/* The outlet list is the way into full coverage, so the grouping is visible on every card. */}
          <Link href={path} className="hover:text-accent hover:underline" title="See every outlet's version">
            {shown.join(", ")}
            {more > 0 && <span className="font-medium text-accent"> +{more}</span>}
          </Link>
          <span> · {timeAgo(story.lastSeenAt)}</span>
        </p>
        <div className="-my-1 -mr-2 flex shrink-0 items-center">
          <SaveButton storyId={story.id} saved={saved} iconOnly />
          <StoryMenu story={story} lead={lead} mutedTopics={mutedTopics} path={path} />
        </div>
      </div>
      {lead.summary && <p className="hidden text-sm text-muted sm:line-clamp-1">{lead.summary}</p>}
      <div className="hidden sm:block">
        <NameChips className="mt-2" label="Names in this story" names={entitiesIn(story.title)} />
      </div>
    </article>
  );
}

/** The ⋯ menu: everything a reader needs now and then, kept off the card itself. */
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
  const item = "block w-full rounded-md px-3 py-2 text-left hover:bg-background";
  return (
    <details className="group relative">
      <summary
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:bg-background hover:text-foreground [&::-webkit-details-marker]:hidden"
        aria-label="More options"
        title="More options"
      >
        <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden>
          <circle cx="4.5" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="15.5" cy="10" r="1.5" />
        </svg>
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-line bg-surface p-1.5 text-sm shadow-lg">
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
