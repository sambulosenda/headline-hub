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

export function StoryCard({
  story,
  mutedTopics = [],
  saved = false,
}: {
  story: StoryWithCoverage;
  mutedTopics?: string[];
  saved?: boolean;
}) {
  const [lead, ...rest] = story.coverage;
  if (!lead) return null;
  const developing = story.recentOutlets >= 2;

  return (
    <article className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
              {story.outletCount} {story.outletCount === 1 ? "source" : "sources"}
            </span>
            {developing && (
              <span className="rounded-full bg-warn-soft px-2 py-0.5 font-medium text-warn">Developing</span>
            )}
            <span>{timeAgo(story.lastSeenAt)}</span>
          </div>
          <h2 className="text-lg font-semibold leading-snug text-balance">
            <a href={outboundUrl(lead.url)} data-outbound="1" className="hover:underline" target="_blank" rel="noopener">
              {story.title}
            </a>
          </h2>
          <p className="mt-1 text-sm text-muted">
            {lead.outletName}
            {lead.summary && <span className="hidden sm:inline"> · {lead.summary}</span>}
          </p>
          <NameChips className="mt-2" label="Names in this story" names={entitiesIn(story.title)} />
        </div>
        {lead.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- remote publisher images, sized by the feed
          <img
            src={lead.imageUrl}
            alt=""
            loading="lazy"
            className="hidden h-20 w-28 shrink-0 rounded-lg object-cover sm:block"
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href={storyPath(story.id, story.title)} className="text-accent hover:underline">
          Full coverage &amp; share
        </Link>
        <SaveButton storyId={story.id} saved={saved} />
        {rest.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-accent">
              More coverage ({rest.length})
            </summary>
            <ul className="mt-2 space-y-2 border-l border-line pl-3">
              {rest.map((a) => (
                <li key={a.id}>
                  <a href={outboundUrl(a.url)} data-outbound="1" className="hover:underline" target="_blank" rel="noopener">
                    {a.title}
                  </a>
                  <span className="text-muted">
                    {" "}
                    · {a.outletName} · {timeAgo(a.publishedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
        <details>
          <summary className="cursor-pointer text-muted">Hide…</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={toggleOutletMute.bind(null, lead.outletId)}>
              <button type="submit" className="rounded-full border border-line px-3 py-1 hover:border-accent">
                Mute {lead.outletName}
              </button>
            </form>
            {story.topics.map((slug) => {
              const topic = findTopic(slug);
              return (
                topic && (
                  <form key={slug} action={toggleTopicMute.bind(null, slug)}>
                    <button type="submit" className="rounded-full border border-line px-3 py-1 hover:border-accent">
                      {mutedTopics.includes(slug) ? "Unmute" : "Mute"} {topic.name}
                    </button>
                  </form>
                )
              );
            })}
          </div>
        </details>
        <details>
          <summary className="cursor-pointer text-muted">Why this is here</summary>
          <ul className="mt-2 list-disc pl-5 text-muted">
            {explainScore(story).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}
