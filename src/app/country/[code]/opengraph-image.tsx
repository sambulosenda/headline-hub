import { findCountry } from "@/config/countries";
import { SHARE_CARD_SIZE, shareCard } from "@/lib/share-card";

export const alt = "Today's stories from this country's newsrooms and the rest of the world";
export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const country = findCountry((await params).code);
  const name = country?.name ?? "Country";
  return shareCard({
    title: `${name} news`,
    footer: `${name}'s own newsrooms first, then the rest of the world`,
  });
}
