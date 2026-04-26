import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "../test/fixtures";
import {
  useInvoices,
  useInvoice,
  useInvoicePreview,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useFinalizeInvoice,
  getInvoicePdfUrl,
} from "./useInvoices";

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
  mockGet.mockReset().mockResolvedValue({ invoices: [], total: 0 });
  mockPost.mockReset().mockResolvedValue({ id: "1" });
  mockPut.mockReset().mockResolvedValue({ id: "1" });
  mockDelete.mockReset().mockResolvedValue(undefined);
});

describe("useInvoices query", () => {
  it("fetches /invoices with no filters", async () => {
    const { result } = renderHook(() => useInvoices(), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/invoices");
  });

  it("appends client_id and status filters", async () => {
    const { result } = renderHook(
      () => useInvoices({ client_id: "c1", status: "draft" }),
      { wrapper: createHookWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockGet.mock.calls[0][0] as string;
    expect(url.startsWith("/invoices?")).toBe(true);
    expect(url).toContain("client_id=c1");
    expect(url).toContain("status=draft");
  });
});

describe("useInvoice", () => {
  it("fetches /invoices/:id when id provided", async () => {
    const { result } = renderHook(() => useInvoice("abc"), {
      wrapper: createHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/invoices/abc");
  });

  it("disabled when id is empty", () => {
    const { result } = renderHook(() => useInvoice(""), {
      wrapper: createHookWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("useInvoices mutations", () => {
  it("useInvoicePreview posts to /invoices/preview", async () => {
    const { result } = renderHook(() => useInvoicePreview(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({
      client_id: "c1",
      period_start: "2026-04-01",
      period_end: "2026-04-30",
    });
    expect(mockPost.mock.calls[0][0]).toBe("/invoices/preview");
  });

  it("useCreateInvoice posts to /invoices", async () => {
    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({
      client_id: "c1",
      period_start: "2026-04-01",
      period_end: "2026-04-30",
      hourly_rate: "100.00",
    });
    expect(mockPost.mock.calls[0][0]).toBe("/invoices");
  });

  it("useUpdateInvoice puts to /invoices/:id", async () => {
    const { result } = renderHook(() => useUpdateInvoice(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync({
      id: "abc",
      data: { hourly_rate: "200.00" },
    });
    expect(mockPut).toHaveBeenCalledWith("/invoices/abc", {
      hourly_rate: "200.00",
    });
  });

  it("useDeleteInvoice deletes /invoices/:id", async () => {
    const { result } = renderHook(() => useDeleteInvoice(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync("abc");
    expect(mockDelete).toHaveBeenCalledWith("/invoices/abc");
  });

  it("useFinalizeInvoice posts to /invoices/:id/finalize", async () => {
    const { result } = renderHook(() => useFinalizeInvoice(), {
      wrapper: createHookWrapper(),
    });
    await result.current.mutateAsync("abc");
    expect(mockPost.mock.calls[0][0]).toBe("/invoices/abc/finalize");
  });
});

describe("getInvoicePdfUrl", () => {
  it("returns the PDF download URL", () => {
    expect(getInvoicePdfUrl("abc")).toBe("/api/invoices/abc/pdf");
  });
});
