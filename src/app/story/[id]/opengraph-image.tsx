import { SHARE_CARD_SIZE, shareCard } from "@/lib/share-card";
import { SITE } from "@/lib/site";
import { parseStoryId } from "@/lib/slug";
import { getStory, outletNames } from "@/lib/story";

export const alt = `Every outlet's coverage of this story on ${SITE.name}`;
export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = parseStoryId((await params).id);
  let story = null;
  try {
    story = id ? await getStory(id) : null;
  } catch (err) {
    console.error(err);
  }
  if (!story) return shareCard({ title: "Every outlet's take on today's stories", footer: "Grouped and ranked in the open" });

  const names = outletNames(story);
  const more = names.length > 4 ? ` +${names.length - 4} more` : "";
  return shareCard({
    title: story.title,
    badge: `${story.outletCount} ${story.outletCount === 1 ? "source" : "sources"}`,
    footer: `${names.slice(0, 4).join(" · ")}${more}`,
  });
}
