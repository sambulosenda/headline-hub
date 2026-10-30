import { findTopic } from "@/config/topics";
import { SHARE_CARD_SIZE, shareCard } from "@/lib/share-card";

export const alt = "Today's stories on this topic from every outlet";
export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const topic = findTopic((await params).slug);
  return shareCard({
    title: `${topic?.name ?? "Today's"} news`,
    footer: "Every outlet's take, grouped and ranked in the open",
  });
}
