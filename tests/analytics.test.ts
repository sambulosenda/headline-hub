import { describe, expect, it } from "vitest";
import { articleUrl, deviceOf, isBot, optedOut, parseCollect, referrerHost, visitorId } from "@/lib/analytics";
import { outboundUrl } from "@/lib/normalize";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

describe("parseCollect", () => {
  it("accepts page views and keeps only the referring host", () => {
    expect(parseCollect({ k: "view", t: "/topic/africa", r: "https://www.google.com/search?q=x" }, "localhost")).toEqual({
      kind: "view",
      target: "/topic/africa",
      referrer: "google.com",
    });
  });

  it("drops our own site as a referrer", () => {
    expect(parseCollect({ k: "view", t: "/", r: "https://headlinehub.example/latest" }, "www.headlinehub.example")?.referrer).toBeNull();
  });

  it("ignores admin, api and sign-in pages, and junk", () => {
    expect(parseCollect({ k: "view", t: "/admin/analytics" }, "h")).toBeNull();
    expect(parseCollect({ k: "view", t: "/auth/verify" }, "h")).toBeNull();
    expect(parseCollect({ k: "view", t: "https://evil.example/" }, "h")).toBeNull();
    expect(parseCollect({ k: "view", t: "/" + "x".repeat(300) }, "h")).toBeNull();
    expect(parseCollect({ k: "click", t: "/" }, "h")).toBeNull();
    expect(parseCollect("nope", "h")).toBeNull();
    expect(parseCollect({ k: "out", t: "javascript:alert(1)" }, "h")).toBeNull();
  });

  it("records clicks against the article URL we stored", () => {
    const stored = "https://www.bbc.co.uk/news/articles/abc?at_medium=RSS";
    expect(parseCollect({ k: "out", t: outboundUrl(stored) }, "h")).toEqual({ kind: "out", target: stored, referrer: null });
    expect(articleUrl(outboundUrl("https://example.com/story"))).toBe("https://example.com/story");
  });
});

describe("visitor filtering", () => {
  it("skips bots and missing user agents", () => {
    expect(isBot(CHROME)).toBe(false);
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("Mozilla/5.0 HeadlessChrome/130.0")).toBe(true);
    expect(isBot(null)).toBe(true);
  });

  it("honours Do Not Track and Global Privacy Control", () => {
    expect(optedOut(new Headers({ dnt: "1" }))).toBe(true);
    expect(optedOut(new Headers({ "sec-gpc": "1" }))).toBe(true);
    expect(optedOut(new Headers())).toBe(false);
  });

  it("tells phones from computers", () => {
    expect(deviceOf(IPHONE)).toBe("mobile");
    expect(deviceOf(CHROME)).toBe("desktop");
  });

  it("referrerHost ignores garbage", () => {
    expect(referrerHost("not a url", "h")).toBeNull();
    expect(referrerHost(42, "h")).toBeNull();
  });
});

describe("visitorId", () => {
  it("is stable within a day and unlinkable across salts", () => {
    const a = visitorId("salt-1", "203.0.113.5", CHROME, "h");
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(visitorId("salt-1", "203.0.113.5", CHROME, "h")).toBe(a);
    expect(visitorId("salt-2", "203.0.113.5", CHROME, "h")).not.toBe(a);
    expect(visitorId("salt-1", "203.0.113.6", CHROME, "h")).not.toBe(a);
    expect(a).not.toContain("203");
  });
});
