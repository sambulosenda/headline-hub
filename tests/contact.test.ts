import { describe, expect, it } from "vitest";
import { validateContact, type ContactInput } from "@/lib/contact";

const base: ContactInput = {
  reason: "correction",
  name: "Ed Itor",
  email: "ed@example.com",
  organisation: "",
  url: "",
  message: "This headline is grouped with the wrong story.",
};

describe("validateContact", () => {
  it("accepts a complete message", () => {
    expect(validateContact(base)).toBeNull();
  });

  it("rejects unknown reasons and bad emails", () => {
    expect(validateContact({ ...base, reason: "spam" })).toMatch(/Pick/);
    expect(validateContact({ ...base, email: "nope" })).toMatch(/email/);
  });

  it("needs the publication for a takedown", () => {
    expect(validateContact({ ...base, reason: "takedown" })).toMatch(/publication/);
    expect(validateContact({ ...base, reason: "takedown", organisation: "The Herald" })).toBeNull();
  });

  it("only takes http links", () => {
    expect(validateContact({ ...base, url: "javascript:alert(1)" })).toMatch(/https/);
    expect(validateContact({ ...base, url: "https://example.com/a" })).toBeNull();
  });
});
