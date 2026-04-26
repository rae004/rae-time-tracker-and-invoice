import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "../test/fixtures";
import {
  useTimeEntries,
  useTimeEntry,
  useWeeklyEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useStopTimer,
} from "./useTimeEntries";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("../services/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ entries: [], total: 0 });
  mockPost.mockReset().mockResolvedValue({ id: "1" });
  mockPut.mockReset().mockResolvedValue({ id: "1" });
  mockDelete.mockReset().mockResolvedValue(undefined);
});

describe("useTimeEntries query", () => {
  it("calls /time-entries with no query string when no filters", async () => {
    const { result } = renderHook(() => useTimeEntries(), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/time-entries");
  });

  it("composes query string from filters", async () => {
    const { result } = renderHook(
      () =>
        useTimeEntries({
          project_id: "p1",
          start_date: "2026-04-01",
          end_date: "2026-04-30",
          running: true,
        }),
      { wrapper: createHookWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockGet.mock.calls[0][0] as string;
    expect(url.startsWith("/time-entries?")).toBe(true);
    expect(url).toContain("project_id=p1");
    expect(url).toContain("start_date=2026-04-01");
    expect(url).toContain("end_date=2026-04-30");
    expect(url).toContain("running=true");
  });

  it("includes running=false explicitly", async () => {
    const { result } = renderHook(() => useTimeEntries({ running: false }), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet.mock.calls[0][0]).toContain("running=false");
  });
});

describe("useTimeEntry query", () => {
  it("calls /time-entries/:id when id provided", async () => {
    const { result } = renderHook(() => useTimeEntry("abc"), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/time-entries/abc");
  });

  it("disabled when id is empty", () => {
    const { result } = renderHook(() => useTimeEntry(""), {
      wrapper: createHookWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("useWeeklyEntries query", () => {
  it("calls /time-entries/weekly without query when weekStart absent", async () => {
    const { result } = renderHook(() => useWeeklyEntries(), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/time-entries/weekly");
  });

  it("appends week_start when provided", async () => {
    const { result } = renderHook(() => useWeeklyEntries("2026-04-11"), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(
      "/time-entries/weekly?week_start=2026-04-11",
    );
  });
});

describe("useTimeEntries mutations", () => {
  it("useCreateTimeEntry posts to /time-entries", async () => {
    const { result } = renderHook(() => useCreateTimeEntry(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({ name: "X", project_id: "p1" });
    expect(mockPost).toHaveBeenCalledWith("/time-entries", {
      name: "X",
      project_id: "p1",
    });
  });

  it("useUpdateTimeEntry puts to /time-entries/:id", async () => {
    const { result } = renderHook(() => useUpdateTimeEntry(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({ id: "abc", data: { name: "New" } });
    expect(mockPut).toHaveBeenCalledWith("/time-entries/abc", { name: "New" });
  });

  it("useDeleteTimeEntry deletes /time-entries/:id", async () => {
    const { result } = renderHook(() => useDeleteTimeEntry(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync("abc");
    expect(mockDelete).toHaveBeenCalledWith("/time-entries/abc");
  });

  it("useStopTimer posts to /time-entries/:id/stop", async () => {
    const { result } = renderHook(() => useStopTimer(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync("abc");
    expect(mockPost).toHaveBeenCalledWith("/time-entries/abc/stop", {});
  });
});
