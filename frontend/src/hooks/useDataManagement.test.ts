import { act, renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "../test/fixtures";
import {
  RESET_CONFIRM_HEADER,
  RESET_CONFIRM_VALUE,
  downloadExportFile,
  parseExportFile,
  useExportData,
  useImportData,
  useResetData,
} from "./useDataManagement";
import type { DataExport } from "../types";

const samplePayload: DataExport = {
  export_version: "1.0",
  export_date: "2026-05-10T00:00:00Z",
  data: {
    user_profile: null,
    category_tags: [],
    clients: [],
    projects: [],
    time_entries: [],
    invoices: [],
  },
};

function mockResponse(body: unknown, init: ResponseInit & { headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("parseExportFile", () => {
  it("parses a valid export JSON file", async () => {
    const file = new File([JSON.stringify(samplePayload)], "export.json", {
      type: "application/json",
    });
    const result = await parseExportFile(file);
    expect(result.export_version).toBe("1.0");
  });

  it("throws on invalid JSON", async () => {
    const file = new File(["not json"], "export.json");
    await expect(parseExportFile(file)).rejects.toThrow(/valid JSON/);
  });

  it("throws when shape is wrong", async () => {
    const file = new File([JSON.stringify({ foo: "bar" })], "export.json");
    await expect(parseExportFile(file)).rejects.toThrow(/export/);
  });
});

describe("downloadExportFile", () => {
  it("creates a blob URL and triggers a download click", () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag) as HTMLAnchorElement;
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    downloadExportFile(samplePayload, "test.json");

    expect(createSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith("blob:fake");
  });
});

describe("useExportData", () => {
  it("fetches export and downloads file", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(samplePayload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="rae-time-tracker-export-2026-05-10.json"',
        },
      }),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const { result } = renderHook(() => useExportData(), {
      wrapper: createHookWrapper(),
    });

    await act(async () => {
      const out = await result.current.mutateAsync();
      expect(out.filename).toBe("rae-time-tracker-export-2026-05-10.json");
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/data/export");
  });

  it("throws on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ error: "boom" }, { status: 500 }),
    );

    const { result } = renderHook(() => useExportData(), {
      wrapper: createHookWrapper(),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow(/boom/);
  });
});

describe("useImportData", () => {
  it("POSTs the payload to /api/data/import", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        success: true,
        counts: {
          user_profile_created: 0,
          user_profile_skipped: 0,
          category_tags_created: 0,
          category_tags_skipped: 0,
          clients_created: 0,
          clients_skipped: 0,
          projects_created: 0,
          projects_skipped: 0,
          time_entries_created: 0,
          invoices_created: 0,
          invoices_skipped: 0,
          invoice_line_items_created: 0,
        },
      }),
    );

    const { result } = renderHook(() => useImportData(), {
      wrapper: createHookWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(samplePayload);
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/data/import",
      expect.objectContaining({ method: "POST" }),
    );
    const call = fetchSpy.mock.calls[0];
    const init = call[1] as RequestInit;
    expect(init.body).toBe(JSON.stringify(samplePayload));
  });

  it("throws when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ error: "bad payload" }, { status: 400 }),
    );

    const { result } = renderHook(() => useImportData(), {
      wrapper: createHookWrapper(),
    });

    await expect(result.current.mutateAsync(samplePayload)).rejects.toThrow(
      /bad payload/,
    );
  });
});

describe("useResetData", () => {
  it("sends DELETE with X-Confirm-Reset header", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ success: true, deleted: { clients: 0 } }),
    );

    const { result } = renderHook(() => useResetData(), {
      wrapper: createHookWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const call = fetchSpy.mock.calls[0];
    expect(call[0]).toBe("/api/data/reset");
    const init = call[1] as RequestInit;
    expect(init.method).toBe("DELETE");
    expect((init.headers as Record<string, string>)[RESET_CONFIRM_HEADER]).toBe(
      RESET_CONFIRM_VALUE,
    );
  });

  it("throws when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ error: "denied" }, { status: 400 }),
    );

    const { result } = renderHook(() => useResetData(), {
      wrapper: createHookWrapper(),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow(/denied/);
  });
});

// Suppress unused warning for waitFor (kept for future tests that need it)
void waitFor;
