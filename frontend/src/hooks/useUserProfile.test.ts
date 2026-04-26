import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "../test/fixtures";
import { useUserProfile, useUpdateUserProfile } from "./useUserProfile";

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock("../services/api", () => ({
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    put: (...a: unknown[]) => mockPut(...a),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ name: "X" });
  mockPut.mockReset().mockResolvedValue({ name: "Y" });
});

describe("useUserProfile", () => {
  it("fetches /user-profile", async () => {
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/user-profile");
  });

  it("useUpdateUserProfile puts to /user-profile", async () => {
    const { result } = renderHook(() => useUpdateUserProfile(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({ name: "New Name" });
    expect(mockPut).toHaveBeenCalledWith("/user-profile", { name: "New Name" });
  });
});
