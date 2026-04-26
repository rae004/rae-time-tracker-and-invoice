import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "../test/fixtures";
import {
  useCategoryTags,
  useCreateCategoryTag,
  useUpdateCategoryTag,
  useDeleteCategoryTag,
} from "./useCategoryTags";

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
  mockGet.mockReset().mockResolvedValue({ tags: [], total: 0 });
  mockPost.mockReset().mockResolvedValue({ id: "1" });
  mockPut.mockReset().mockResolvedValue({ id: "1" });
  mockDelete.mockReset().mockResolvedValue(undefined);
});

describe("useCategoryTags", () => {
  it("fetches /category-tags", async () => {
    const { result } = renderHook(() => useCategoryTags(), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/category-tags");
  });

  it("useCreateCategoryTag posts to /category-tags", async () => {
    const { result } = renderHook(() => useCreateCategoryTag(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({ name: "Dev", color: "#fff" });
    expect(mockPost).toHaveBeenCalledWith("/category-tags", {
      name: "Dev",
      color: "#fff",
    });
  });

  it("useUpdateCategoryTag puts to /category-tags/:id", async () => {
    const { result } = renderHook(() => useUpdateCategoryTag(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({
      id: "abc",
      data: { name: "Renamed" },
    });
    expect(mockPut).toHaveBeenCalledWith("/category-tags/abc", {
      name: "Renamed",
    });
  });

  it("useDeleteCategoryTag deletes /category-tags/:id", async () => {
    const { result } = renderHook(() => useDeleteCategoryTag(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync("abc");
    expect(mockDelete).toHaveBeenCalledWith("/category-tags/abc");
  });
});
