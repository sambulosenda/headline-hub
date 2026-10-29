import { describe, expect, it } from "vitest";
import { parseScope, sseEvent } from "@/lib/sse";

describe("sseEvent", () => {
  it("formats an event with id and JSON data", () => {
    expect(sseEvent("updates", { newStories: 2 }, 41)).toBe('event: updates\nid: 41\ndata: {"newStories":2}\n\n');
  });
});

describe("parseScope", () => {
  it("accepts known filters", () => {
    expect(parseScope(new URLSearchParams("topic=football&region=uk&since=120"))).toEqual({
      filters: { topic: "football", region: "uk" },
      since: 120,
    });
  });

  it("accepts the Africa region", () => {
    expect(parseScope(new URLSearchParams("region=africa")).filters.region).toBe("africa");
  });

  it("drops anything unexpected", () => {
    expect(parseScope(new URLSearchParams("topic=x;drop&region=mars&since=-4"))).toEqual({
      filters: { topic: undefined, region: undefined },
      since: 0,
    });
  });
});
