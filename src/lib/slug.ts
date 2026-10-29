/** URL-safe slug from a headline: lowercase ASCII words joined by hyphens. */
export function slugify(text: string, maxLength = 80): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  // Prefer ending on a whole word.
  return cut.includes("-") ? cut.slice(0, cut.lastIndexOf("-")) : cut;
}

/**
 * A story's shareable path. The id is what matters; the slug is for humans and
 * link previews, and is allowed to drift as the story's headline changes.
 */
export function storyPath(id: number, title: string): string {
  const slug = slugify(title);
  return slug ? `/story/${id}-${slug}` : `/story/${id}`;
}

/** The story id at the start of a `/story/[id]` segment, or null. */
export function parseStoryId(segment: string): number | null {
  const match = /^(\d{1,9})(?:-|$)/.exec(decodeURIComponent(segment));
  if (!match) return null;
  const id = Number(match[1]);
  return id > 0 ? id : null;
}
