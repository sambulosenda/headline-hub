import { findEntity } from "@/config/entities";
import { resolveEntity } from "@/lib/entities";
import { SHARE_CARD_SIZE, shareCard } from "@/lib/share-card";

export const alt = "Every outlet's stories mentioning this name";
export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Listed names need no database, so their cards can be drawn at build time.
  const listed = findEntity(slug);
  let name = listed?.name;
  if (!name) {
    try {
      name = (await resolveEntity(slug))?.name;
    } catch (err) {
      console.error(err);
    }
  }
  return shareCard({
    title: name ?? "In the news",
    footer: "Every outlet's stories, grouped and ranked in the open",
  });
}
