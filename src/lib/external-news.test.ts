import { describe, it, expect } from "vitest";
import {
  mergeWorldItems,
  WORLD_MAX_AGE_MS,
  type ExternalArticle,
} from "./external-news.functions";

const NOW = Date.UTC(2026, 6, 5, 12, 0, 0); // 2026-07-05T12:00:00Z

function article(
  id: string,
  agoMs: number,
  extra: Partial<ExternalArticle> = {},
): ExternalArticle {
  return {
    id,
    title: `Title ${id}`,
    summary: "",
    url: `https://example.com/${id}`,
    source: "test",
    publishedAt: new Date(NOW - agoMs).toISOString(),
    ...extra,
  };
}

describe("mergeWorldItems", () => {
  it("drops items older than the freshness window (24h)", () => {
    const items = [
      article("fresh", 60 * 60 * 1000), // 1h old
      article("edge-in", WORLD_MAX_AGE_MS - 1000), // just inside
      article("stale", WORLD_MAX_AGE_MS + 60 * 1000), // just outside
      article("ancient", 5 * 24 * 60 * 60 * 1000), // 5 days old
    ];
    const ids = mergeWorldItems(items, NOW).map((a) => a.id);
    expect(ids).toContain("fresh");
    expect(ids).toContain("edge-in");
    expect(ids).not.toContain("stale");
    expect(ids).not.toContain("ancient");
  });

  it("sorts newest first by publishedAt", () => {
    const items = [
      article("old", 6 * 60 * 60 * 1000),
      article("newest", 5 * 60 * 1000),
      article("mid", 60 * 60 * 1000),
    ];
    const ids = mergeWorldItems(items, NOW).map((a) => a.id);
    expect(ids).toEqual(["newest", "mid", "old"]);
  });

  it("dedupes by id, keeping the first occurrence", () => {
    const items = [
      article("dupe", 60 * 60 * 1000, { source: "first" }),
      article("dupe", 30 * 60 * 1000, { source: "second" }),
      article("other", 2 * 60 * 60 * 1000),
    ];
    const result = mergeWorldItems(items, NOW);
    expect(result).toHaveLength(2);
    const dupe = result.find((a) => a.id === "dupe")!;
    expect(dupe.source).toBe("first");
  });

  it("drops items with invalid publishedAt", () => {
    const items = [
      article("good", 60 * 60 * 1000),
      { ...article("bad", 0), publishedAt: "not-a-date" },
    ];
    const ids = mergeWorldItems(items, NOW).map((a) => a.id);
    expect(ids).toEqual(["good"]);
  });

  it("caps the result to maxItems", () => {
    const items = Array.from({ length: 80 }, (_, i) =>
      article(`a${i}`, i * 60 * 1000),
    );
    const result = mergeWorldItems(items, NOW, WORLD_MAX_AGE_MS, 60);
    expect(result).toHaveLength(60);
    // Newest first, so a0 should be at index 0.
    expect(result[0].id).toBe("a0");
  });
});
