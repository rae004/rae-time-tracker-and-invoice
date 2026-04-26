import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "../test/fixtures";
import {
  useClients,
  useClient,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from "./useClients";

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
  mockGet.mockReset().mockResolvedValue({ clients: [], total: 0 });
  mockPost.mockReset().mockResolvedValue({ id: "1" });
  mockPut.mockReset().mockResolvedValue({ id: "1" });
  mockDelete.mockReset().mockResolvedValue(undefined);
});

describe("useClients", () => {
  it("fetches /clients", async () => {
    const { result } = renderHook(() => useClients(), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/clients");
  });
});

describe("useClient", () => {
  it("fetches /clients/:id when id provided", async () => {
    const { result } = renderHook(() => useClient("abc"), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/clients/abc");
  });

  it("disabled when id is empty", () => {
    const { result } = renderHook(() => useClient(""), {
      wrapper: createHookWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("useClients mutations", () => {
  it("useCreateClient posts to /clients", async () => {
    const { result } = renderHook(() => useCreateClient(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({
      name: "Acme",
      address_line1: "1 St",
      city: "X",
      state: "NY",
      zip_code: "10001",
      hourly_rate: "100.00",
    });
    expect(mockPost.mock.calls[0][0]).toBe("/clients");
  });

  it("useUpdateClient puts to /clients/:id", async () => {
    const { result } = renderHook(() => useUpdateClient(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({ id: "abc", data: { name: "New" } });
    expect(mockPut).toHaveBeenCalledWith("/clients/abc", { name: "New" });
  });

  it("useDeleteClient deletes /clients/:id", async () => {
    const { result } = renderHook(() => useDeleteClient(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync("abc");
    expect(mockDelete).toHaveBeenCalledWith("/clients/abc");
  });
});
