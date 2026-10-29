export const TOPICS = [
  { slug: "uk", name: "UK" },
  { slug: "world", name: "World" },
  { slug: "africa", name: "Africa" },
  { slug: "business", name: "Business" },
  { slug: "tech", name: "Tech" },
  { slug: "science", name: "Science" },
  { slug: "football", name: "Football" },
] as const;

export type TopicSlug = (typeof TOPICS)[number]["slug"];

export function findTopic(slug: string) {
  return TOPICS.find((t) => t.slug === slug);
}
