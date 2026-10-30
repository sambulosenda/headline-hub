import { SHARE_CARD_SIZE, shareCard } from "@/lib/share-card";
import { SITE } from "@/lib/site";

export const alt = SITE.description;
export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareCard({ title: "Every outlet's take on today's stories", footer: "Grouped and ranked in the open" });
}
