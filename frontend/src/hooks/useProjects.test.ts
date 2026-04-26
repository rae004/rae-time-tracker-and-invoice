import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "../test/fixtures";
import {
  useProjects,
  useActiveProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "./useProjects";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("../services/api", () => ({
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    put: (...a: unknown[]) => mockPut(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
  },
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ projects: [], total: 0 });
  mockPost.mockReset().mockResolvedValue({ id: "1" });
  mockPut.mockReset().mockResolvedValue({ id: "1" });
  mockDelete.mockReset().mockResolvedValue(undefined);
});

describe("useProjects", () => {
  it("fetches /projects with no filters", async () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/projects");
  });

  it("composes client_id and active filters", async () => {
    const { result } = renderHook(
      () => useProjects({ client_id: "c1", active: true }),
      { wrapper: createHookWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain("client_id=c1");
    expect(url).toContain("active=true");
  });

  it("active=false is included explicitly", async () => {
    const { result } = renderHook(() => useProjects({ active: false }), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet.mock.calls[0][0]).toContain("active=false");
  });
});

describe("useActiveProjects", () => {
  it("requests active=true", async () => {
    const { result } = renderHook(() => useActiveProjects(), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet.mock.calls[0][0]).toContain("active=true");
  });
});

describe("useProjects mutations", () => {
  it("useCreateProject posts to /projects", async () => {
    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({
      name: "P",
      client_id: "c1",
      is_active: true,
    });
    expect(mockPost).toHaveBeenCalledWith("/projects", {
      name: "P",
      client_id: "c1",
      is_active: true,
    });
  });

  it("useUpdateProject puts to /projects/:id", async () => {
    const { result } = renderHook(() => useUpdateProject(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({ id: "abc", data: { name: "New" } });
    expect(mockPut).toHaveBeenCalledWith("/projects/abc", { name: "New" });
  });

  it("useDeleteProject deletes /projects/:id", async () => {
    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync("abc");
    expect(mockDelete).toHaveBeenCalledWith("/projects/abc");
  });
});
