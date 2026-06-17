import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePagination } from "./usePagination";

const list = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("usePagination", () => {
  it("returns the first page and the total page count", () => {
    const { result } = renderHook(() => usePagination(list(30), 10));
    expect(result.current.pageItems).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.current.page).toBe(1);
    expect(result.current.pageCount).toBe(3);
  });

  it("returns the requested page slice on setPage", () => {
    const { result } = renderHook(() => usePagination(list(25), 10));
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.pageItems).toEqual([20, 21, 22, 23, 24]);
  });

  it("treats a list that fits in one page as a single page", () => {
    const { result } = renderHook(() => usePagination(list(4), 10));
    expect(result.current.pageCount).toBe(1);
    expect(result.current.pageItems).toHaveLength(4);
  });

  it("clamps an out-of-range page to the last available page", () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 10), {
      initialProps: { items: list(30) },
    });
    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
    // Shrinking the list resets to the first page (source size changed).
    rerender({ items: list(15) });
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toHaveLength(10);
  });
});
