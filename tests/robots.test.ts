import { describe, expect, it } from "vitest";
import { isAllowed } from "@/lib/robots";

const robots = `
User-agent: GPTBot
Disallow: /

User-agent: *
Disallow: /private/
Allow: /private/feeds/
Disallow: /*.json$
`;

describe("isAllowed", () => {
  it("applies the * group to our bot", () => {
    expect(isAllowed(robots, "/news/rss.xml")).toBe(true);
    expect(isAllowed(robots, "/private/page")).toBe(false);
  });

  it("prefers the longest matching rule", () => {
    expect(isAllowed(robots, "/private/feeds/uk.xml")).toBe(true);
  });

  it("supports wildcards and end anchors", () => {
    expect(isAllowed(robots, "/data/x.json")).toBe(false);
    expect(isAllowed(robots, "/data/x.json?v=1")).toBe(true);
  });

  it("uses a group naming our bot over *", () => {
    expect(isAllowed("User-agent: HeadlineHubBot\nDisallow: /\n\nUser-agent: *\nAllow: /", "/rss")).toBe(false);
  });

  it("allows everything when robots.txt is empty", () => {
    expect(isAllowed("", "/anything")).toBe(true);
  });
});
