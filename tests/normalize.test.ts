import { describe, expect, it } from "vitest";
import { canonicalUrl, cleanText, outboundUrl } from "@/lib/normalize";

describe("canonicalUrl", () => {
  it("drops tracking params, fragments and trailing slashes", () => {
    expect(canonicalUrl("http://WWW.Example.com/a/b/?utm_source=x&id=2&fbclid=y#frag")).toBe(
      "https://www.example.com/a/b/?id=2",
    );
    expect(canonicalUrl("https://example.com/story/")).toBe("https://example.com/story");
  });

  it("sorts remaining params so equal URLs compare equal", () => {
    expect(canonicalUrl("https://e.com/x?b=2&a=1")).toBe(canonicalUrl("https://e.com/x?a=1&b=2"));
  });

  it("rejects non-web URLs", () => {
    expect(canonicalUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalUrl("not a url")).toBeNull();
  });
});

describe("cleanText", () => {
  it("strips tags and decodes entities", () => {
    expect(cleanText("<p>Rates &amp; inflation&#8217;s rise&nbsp;</p>")).toBe("Rates & inflation’s rise");
  });

  it("truncates on a word boundary", () => {
    const out = cleanText("one two three four five six", 15);
    expect(out).toBe("one two three…");
  });
});

describe("outboundUrl", () => {
  it("tags links for the publisher's analytics", () => {
    expect(outboundUrl("https://e.com/a?id=1")).toBe("https://e.com/a?id=1&utm_source=headlinehub&utm_medium=referral");
  });
});
