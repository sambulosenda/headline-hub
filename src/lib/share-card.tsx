import { ImageResponse } from "next/og";
import { SITE } from "./site";

export const SHARE_CARD_SIZE = { width: 1200, height: 630 };

const MAX_TITLE = 150;

function fontSize(title: string) {
  if (title.length <= 60) return 68;
  if (title.length <= 100) return 56;
  return 46;
}

export interface ShareCard {
  title: string;
  /** Small pill before the footer, e.g. "12 sources". */
  badge?: string;
  footer: string;
}

/** Link-preview card: our own rendering of the text, never a publisher's photo. */
export function shareCard({ title, badge, footer }: ShareCard): ImageResponse {
  const shown = title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE - 1).trimEnd()}…` : title;
  const [first, second] = SITE.wordmark;

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
          {first}
          <span style={{ color: "#7aa7ff" }}>{second}</span>
        </div>
        <div style={{ display: "flex", fontSize: fontSize(shown), fontWeight: 700, lineHeight: 1.15 }}>{shown}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28, color: "#a3a39d" }}>
          {badge && (
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
              {badge}
            </span>
          )}
          <span style={{ display: "flex" }}>{footer}</span>
        </div>
      </div>
    ),
    SHARE_CARD_SIZE,
  );
}
