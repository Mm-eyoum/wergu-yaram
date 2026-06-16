import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { timeAgoLabel } from "./communityPosts";

describe("timeAgoLabel", () => {
  const NOW = new Date("2026-06-16T12:00:00.000Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  const ago = (ms: number) => timeAgoLabel(new Date(NOW - ms));

  it("formats seconds", () => {
    expect(ago(5_000)).toBe("il y a 5 s");
  });

  it("formats minutes", () => {
    expect(ago(90_000)).toBe("il y a 1 min");
  });

  it("formats hours", () => {
    expect(ago(3_600_000)).toBe("il y a 1 h");
  });

  it("formats days", () => {
    expect(ago(2 * 24 * 3_600_000)).toBe("il y a 2 j");
  });
});
