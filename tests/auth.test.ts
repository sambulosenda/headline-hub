import { describe, expect, it } from "vitest";
import { mergeMutes, NO_MUTES } from "@/lib/mutes";
import { hashToken, newToken, normalizeEmail, readCookie } from "@/lib/tokens";

describe("sign-in tokens", () => {
  it("are long, URL-safe and unique", () => {
    const a = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newToken()).not.toBe(a);
  });

  it("are stored as a stable hash, never as themselves", () => {
    const token = newToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});

describe("normalizeEmail", () => {
  it("lower-cases and trims", () => {
    expect(normalizeEmail("  Sam@Example.COM ")).toBe("sam@example.com");
  });

  it("rejects things that aren't addresses", () => {
    for (const bad of ["", "sam", "sam@", "sam@example", "a b@example.com", `${"a".repeat(250)}@x.co`]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });
});

describe("readCookie", () => {
  it("finds one cookie in a header", () => {
    expect(readCookie("a=1; hh_session=abc; b=2", "hh_session")).toBe("abc");
    expect(readCookie("hh_mutes=%7B%7D", "hh_mutes")).toBe("{}");
  });

  it("is undefined when missing or malformed", () => {
    expect(readCookie(null, "hh_session")).toBeUndefined();
    expect(readCookie("x_hh_session=abc", "hh_session")).toBeUndefined();
    expect(readCookie("hh_mutes=%E0%A4%A", "hh_mutes")).toBeUndefined();
  });
});

describe("mergeMutes", () => {
  it("joins a browser's mutes onto an account's without duplicates", () => {
    const account = { outlets: ["bbc"], topics: ["football"], keywords: ["love island"] };
    const browser = { outlets: ["bbc", "mirror"], topics: [], keywords: ["Love Island", "strictly"] };
    expect(mergeMutes(account, browser)).toEqual({
      outlets: ["bbc", "mirror"],
      topics: ["football"],
      keywords: ["love island", "strictly"],
    });
  });

  it("is a no-op with nothing to add", () => {
    const account = { outlets: ["bbc"], topics: [], keywords: [] };
    expect(mergeMutes(account, NO_MUTES)).toEqual(account);
  });
});
