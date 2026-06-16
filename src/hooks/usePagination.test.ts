import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePagination } from "./usePagination";

const list = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("usePagination", () => {
  it("caps the first page at the given size and reports the remainder", () => {
    const { result } = renderHook(() => usePagination(list(30), 10));
    expect(result.current.paged).toHaveLength(10);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.remaining).toBe(20);
  });

  it("reveals another page on showMore until the list is exhausted", () => {
    const { result } = renderHook(() => usePagination(list(25), 10));
    act(() => result.current.showMore());
    expect(result.current.paged).toHaveLength(20);
    act(() => result.current.showMore());
    expect(result.current.paged).toHaveLength(25);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("shows everything (no more) when the list fits in one page", () => {
    const { result } = renderHook(() => usePagination(list(4), 10));
    expect(result.current.paged).toHaveLength(4);
    expect(result.current.hasMore).toBe(false);
  });

  it("resets to the first page when the source list changes (new filter/search)", () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 10), {
      initialProps: { items: list(30) },
    });
    act(() => result.current.showMore());
    expect(result.current.paged).toHaveLength(20);
    rerender({ items: list(15) });
    expect(result.current.paged).toHaveLength(10);
  });
});
