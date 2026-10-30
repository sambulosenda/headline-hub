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
      following: false,
    });
  });

  it("accepts the Africa region", () => {
    expect(parseScope(new URLSearchParams("region=africa")).filters.region).toBe("africa");
  });

  it("drops anything unexpected", () => {
    expect(parseScope(new URLSearchParams("topic=x;drop&region=mars&since=-4&entity=Bad Slug!"))).toEqual({
      filters: { topic: undefined, region: undefined },
      since: 0,
      following: false,
    });
  });

  it("passes an entity slug and the Following flag through", () => {
    const scope = parseScope(new URLSearchParams("entity=manchester-united&following=1"));
    expect(scope.entity).toBe("manchester-united");
    expect(scope.following).toBe(true);
  });
});
