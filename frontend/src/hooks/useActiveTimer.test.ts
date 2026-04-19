import { renderHook, act } from "@testing-library/react";
import { useRunningDuration } from "./useActiveTimer";
import { createTimeEntry } from "../test/fixtures";

describe("useRunningDuration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when entry is null", () => {
    const { result } = renderHook(() => useRunningDuration(null));
    expect(result.current).toBe(0);
  });

  it("returns duration_ms when entry is not running", () => {
    const entry = createTimeEntry({ duration_ms: 5000, is_running: false });
    const { result } = renderHook(() => useRunningDuration(entry));
    expect(result.current).toBe(5000);
  });

  it("returns 0 when entry is null and has no duration", () => {
    const { result } = renderHook(() => useRunningDuration(null));
    expect(result.current).toBe(0);
  });

  it("calculates live duration from start_time when running", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const startTime = new Date(now - 10000).toISOString();
    const entry = createTimeEntry({
      start_time: startTime,
      end_time: null,
      duration_ms: null,
      is_running: true,
    });

    const { result } = renderHook(() => useRunningDuration(entry));
    expect(result.current).toBeGreaterThanOrEqual(9900);
    expect(result.current).toBeLessThanOrEqual(10100);
  });

  it("updates duration as time advances", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const startTime = new Date(now - 5000).toISOString();
    const entry = createTimeEntry({
      start_time: startTime,
      end_time: null,
      duration_ms: null,
      is_running: true,
    });

    const { result } = renderHook(() => useRunningDuration(entry));
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBeGreaterThan(initial);
  });

  it("cleans up interval on unmount", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const entry = createTimeEntry({
      start_time: new Date(now - 1000).toISOString(),
      end_time: null,
      duration_ms: null,
      is_running: true,
    });

    const { unmount } = renderHook(() => useRunningDuration(entry));
    unmount();

    expect(() => {
      vi.advanceTimersByTime(200);
    }).not.toThrow();
  });

  it("resets when entry changes from running to stopped", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const runningEntry = createTimeEntry({
      start_time: new Date(now - 10000).toISOString(),
      end_time: null,
      duration_ms: null,
      is_running: true,
    });

    const { result, rerender } = renderHook(
      ({ entry }) => useRunningDuration(entry),
      { initialProps: { entry: runningEntry } },
    );

    expect(result.current).toBeGreaterThanOrEqual(9900);

    const stoppedEntry = createTimeEntry({
      ...runningEntry,
      end_time: new Date(now).toISOString(),
      duration_ms: 10000,
      is_running: false,
    });

    rerender({ entry: stoppedEntry });
    expect(result.current).toBe(10000);
  });
});
