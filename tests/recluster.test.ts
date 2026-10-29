import { describe, expect, it } from "vitest";
import { cluster } from "../src/worker/recluster";

const row = (id: number, title: string, hoursAgo: number, outletName = `Outlet ${id}`) => ({
  id,
  title,
  outletName,
  storyId: null,
  embedding: null,
  publishedAt: new Date(Date.UTC(2026, 9, 29, 12) - hoursAgo * 3_600_000),
});

describe("cluster", () => {
  it("groups the same event and keeps different ones apart", () => {
    const groups = cluster(
      [
        row(1, "Bank of England holds interest rates at 4%", 3),
        row(2, "Arsenal beat Spurs 3-1 in north London derby", 2),
        row(3, "Bank of England keeps interest rates on hold at 4%", 1),
      ],
      0.7,
    );
    expect(groups).toEqual([[1, 3], [2]]);
  });

  it("does not join stories more than 48 hours apart", () => {
    const groups = cluster(
      [
        row(1, "Bank of England holds interest rates at 4%", 60),
        row(2, "Bank of England keeps interest rates on hold at 4%", 1),
      ],
      0.7,
    );
    expect(groups).toEqual([[1], [2]]);
  });
});
