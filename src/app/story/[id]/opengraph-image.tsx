import { ImageResponse } from "next/og";
import { parseStoryId } from "@/lib/slug";
import { getStory, outletNames } from "@/lib/story";

export const alt = "Every outlet's coverage of this story on Headline Hub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MAX_TITLE = 150;

function fontSize(title: string) {
  if (title.length <= 60) return 68;
  if (title.length <= 100) return 56;
  return 46;
}

/** Link-preview card: our own rendering of the headline, never a publisher's photo. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = parseStoryId((await params).id);
  let story = null;
  try {
    story = id ? await getStory(id) : null;
  } catch (err) {
    console.error(err);
  }

  const title = story
    ? story.title.length > MAX_TITLE
      ? `${story.title.slice(0, MAX_TITLE - 1).trimEnd()}…`
      : story.title
    : "Every outlet's take on today's stories";
  const names = story ? outletNames(story) : [];
  const shown = names.slice(0, 4).join(" · ");
  const more = names.length > 4 ? ` +${names.length - 4} more` : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#121212",
          color: "#ececea",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, fontWeight: 700 }}>
          Headline<span style={{ color: "#7aa7ff" }}>Hub</span>
        </div>
        <div style={{ display: "flex", fontSize: fontSize(title), fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28, color: "#a3a39d" }}>
          {story && (
            <span
              style={{
                display: "flex",
                padding: "6px 18px",
                borderRadius: 999,
                background: "#1c2a45",
                color: "#7aa7ff",
                fontWeight: 600,
              }}
            >
              {story.outletCount} {story.outletCount === 1 ? "source" : "sources"}
            </span>
          )}
          <span style={{ display: "flex" }}>{story ? `${shown}${more}` : "Grouped and ranked in the open"}</span>
        </div>
      </div>
    ),
    size,
  );
}
