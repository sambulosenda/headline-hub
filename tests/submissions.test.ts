import { afterEach, describe, expect, it, vi } from "vitest";
import { configSnippet, isAdmin, normalizeFeedUrl, validateSubmission, type SubmissionInput } from "@/lib/submissions";
import { isPrivateAddress, vetFeed } from "@/lib/vet-feed";

const valid: SubmissionInput = {
  outletName: "Harare Daily",
  homepage: "https://hararedaily.example/",
  feedUrl: "https://hararedaily.example/feed/",
  contactEmail: "Editor@HarareDaily.example",
  region: "africa",
  topics: ["africa"],
  notes: "",
};

describe("validateSubmission", () => {
  it("accepts a complete submission", () => {
    expect(validateSubmission(valid)).toBeNull();
  });

  it("rejects missing or bad fields", () => {
    expect(validateSubmission({ ...valid, outletName: " " })).toMatch(/name/);
    expect(validateSubmission({ ...valid, feedUrl: "ftp://x.example/feed" })).toMatch(/feed URL/);
    expect(validateSubmission({ ...valid, homepage: "not a url" })).toMatch(/homepage/);
    expect(validateSubmission({ ...valid, contactEmail: "nope" })).toMatch(/email/);
    expect(validateSubmission({ ...valid, region: "mars" })).toMatch(/based/);
    expect(validateSubmission({ ...valid, topics: [] })).toMatch(/topic/);
    expect(validateSubmission({ ...valid, topics: ["gossip"] })).toMatch(/topic/);
    expect(validateSubmission({ ...valid, notes: "x".repeat(1001) })).toMatch(/1,000/);
  });
});

describe("normalizeFeedUrl", () => {
  it("drops fragments and trailing slashes so duplicates match", () => {
    expect(normalizeFeedUrl(" https://a.example/feed/#top ")).toBe("https://a.example/feed");
    expect(normalizeFeedUrl("https://a.example/feed")).toBe("https://a.example/feed");
  });

  it("refuses non-web schemes", () => {
    expect(normalizeFeedUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeFeedUrl("file:///etc/passwd")).toBeNull();
  });
});

describe("isAdmin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("matches ADMIN_EMAILS case-insensitively", () => {
    vi.stubEnv("ADMIN_EMAILS", " Sam@Example.com, other@example.com");
    expect(isAdmin("sam@example.com")).toBe(true);
    expect(isAdmin("someone@example.com")).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("has no admins when unset", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdmin("sam@example.com")).toBe(false);
  });
});

describe("configSnippet", () => {
  it("builds an outlet entry with escaped values", () => {
    const snippet = configSnippet({ ...valid, outletName: 'The "Herald"', topics: ["africa", "business"] });
    expect(snippet).toContain('name: "The \\"Herald\\""');
    expect(snippet).toContain('feeds: [{ url: "https://hararedaily.example/feed/", topics: ["africa", "business"] }]');
  });
});

describe("isPrivateAddress", () => {
  it("flags addresses inside the network", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("lets public addresses through", () => {
    for (const ip of ["8.8.8.8", "172.32.0.1", "2a00:1450::1", "::ffff:8.8.8.8"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});

describe("vetFeed", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  const rss = (dates: string[]) =>
    `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>${dates
      .map((d, i) => `<item><title>Story ${i}</title><link>https://8.8.8.8/s/${i}</link><pubDate>${d}</pubDate></item>`)
      .join("")}</channel></rss>`;

  function serve(routes: Record<string, () => Response>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string) => {
        const path = new URL(input).pathname;
        return routes[path]?.() ?? new Response("", { status: 404 });
      }),
    );
  }

  afterEach(() => vi.unstubAllGlobals());

  it("passes a healthy feed and returns sample headlines", async () => {
    const fresh = "Thu, 30 Oct 2026 10:00:00 GMT";
    serve({ "/feed": () => new Response(rss([fresh, fresh, fresh, fresh])) });
    const result = await vetFeed("https://8.8.8.8/feed", "https://8.8.8.8/", now);
    expect(result.ok).toBe(true);
    expect(result.checks.map((c) => c.status)).toEqual(["pass", "pass", "pass", "pass", "pass", "pass"]);
    expect(result.sampleTitles).toEqual(["Story 0", "Story 1", "Story 2", "Story 3"]);
  });

  it("stops when robots.txt blocks the feed", async () => {
    serve({ "/robots.txt": () => new Response("User-agent: *\nDisallow: /") });
    const result = await vetFeed("https://8.8.8.8/feed", "https://8.8.8.8/", now);
    expect(result.ok).toBe(false);
    expect(result.checks.at(-1)).toMatchObject({ name: "robots.txt", status: "fail" });
  });

  it("fails stale and thin feeds", async () => {
    serve({ "/feed": () => new Response(rss(["Mon, 01 Sep 2026 10:00:00 GMT"])) });
    const result = await vetFeed("https://8.8.8.8/feed", "https://8.8.8.8/", now);
    expect(result.ok).toBe(false);
    expect(result.checks.filter((c) => c.status === "fail").map((c) => c.name)).toEqual(["Has articles", "Recently updated"]);
  });

  it("refuses private addresses, including via redirect", async () => {
    const direct = await vetFeed("http://127.0.0.1/feed", "http://127.0.0.1/", now);
    expect(direct.checks).toEqual([{ name: "Address", status: "fail", detail: "must be a public website" }]);

    serve({ "/feed": () => new Response(null, { status: 302, headers: { location: "http://10.0.0.5/admin" } }) });
    const redirected = await vetFeed("https://8.8.8.8/feed", "https://8.8.8.8/", now);
    expect(redirected.checks.at(-1)).toMatchObject({ name: "Feed loads", status: "fail", detail: "must be a public website" });
  });
});
