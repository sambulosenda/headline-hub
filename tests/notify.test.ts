import { describe, expect, it } from "vitest";
import { digestDue, isBreaking, renderAlert, renderDigest } from "@/lib/notify";
import type { StoryWithCoverage } from "@/lib/queries";

const now = new Date(2026, 9, 29, 12, 0, 0);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

function story(overrides: Partial<StoryWithCoverage> = {}): StoryWithCoverage {
  return {
    id: 42,
    title: "Bank <of> England holds rates",
    outletCount: 6,
    recentOutlets: 3,
    avgQuality: 0.9,
    score: 3,
    firstSeenAt: hoursAgo(1),
    lastSeenAt: hoursAgo(0.1),
    topics: ["business"],
    countries: [],
    coverage: [
      { id: 1, outletId: "bbc", url: "https://bbc.co.uk/x", title: "t", summary: "", imageUrl: null, publishedAt: now, outletName: "BBC News", outletRegion: "uk", outletCountry: null },
      { id: 2, outletId: "ft", url: "https://ft.com/x", title: "t", summary: "", imageUrl: null, publishedAt: now, outletName: "Financial Times", outletRegion: "uk", outletCountry: null },
    ],
    ...overrides,
  };
}

const links = { site: new URL("http://localhost:3000"), unsubscribeUrl: "http://localhost:3000/unsubscribe?token=abc" };

describe("isBreaking", () => {
  it("fires for a fresh story many outlets are piling onto", () => {
    expect(isBreaking(story(), now)).toBe(true);
  });

  it("ignores slow, narrow or old stories", () => {
    expect(isBreaking(story({ recentOutlets: 2 }), now)).toBe(false);
    expect(isBreaking(story({ outletCount: 4 }), now)).toBe(false);
    expect(isBreaking(story({ firstSeenAt: hoursAgo(4) }), now)).toBe(false);
  });
});

describe("digestDue", () => {
  it("waits until the digest hour", () => {
    expect(digestDue(null, new Date(2026, 9, 29, 6, 59), 7)).toBe(false);
    expect(digestDue(null, new Date(2026, 9, 29, 7, 0), 7)).toBe(true);
  });

  it("sends once a day", () => {
    expect(digestDue(new Date(2026, 9, 29, 7, 5), new Date(2026, 9, 29, 18, 0), 7)).toBe(false);
    expect(digestDue(new Date(2026, 9, 28, 7, 5), new Date(2026, 9, 29, 7, 1), 7)).toBe(true);
  });
});

describe("email rendering", () => {
  it("links each story page and escapes headlines in HTML", () => {
    const email = renderDigest("sam@example.com", [story()], links);
    expect(email.text).toContain("http://localhost:3000/story/42-bank-of-england-holds-rates");
    expect(email.html).toContain("Bank &#60;of&#62; England");
    expect(email.html).not.toContain("<of>");
    expect(email.unsubscribeUrl).toBe(links.unsubscribeUrl);
    expect(email.text).toContain("Unsubscribe from all emails: http://localhost:3000/unsubscribe?token=abc");
  });

  it("names the outlets covering a breaking story", () => {
    const email = renderAlert("sam@example.com", story(), links);
    expect(email.subject).toBe("Breaking: Bank <of> England holds rates");
    expect(email.text).toContain("Now covered by 6 sources: BBC News, Financial Times.");
  });
});
