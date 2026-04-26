import { api } from "./api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init?: { status?: number; ok?: boolean }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("api - URLs and methods", () => {
  it("get prepends /api and uses GET", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await api.get("/clients");
    expect(fetchMock).toHaveBeenCalledWith("/api/clients");
  });

  it("post sends JSON body and Content-Type header", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1" }));
    await api.post("/clients", { name: "Acme" });

    expect(fetchMock).toHaveBeenCalledWith("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Acme" }),
    });
  });

  it("post serializes undefined data", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await api.post("/invoices/abc/finalize");

    const call = fetchMock.mock.calls[0];
    expect(call?.[1]).toMatchObject({ method: "POST" });
    expect((call?.[1] as RequestInit).body).toBe(JSON.stringify(undefined));
  });

  it("put sends JSON body", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1" }));
    await api.put("/clients/1", { name: "Updated" });

    expect(fetchMock).toHaveBeenCalledWith("/api/clients/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
  });

  it("delete uses DELETE method", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, { status: 204 }));
    await api.delete("/clients/1");
    expect(fetchMock).toHaveBeenCalledWith("/api/clients/1", { method: "DELETE" });
  });
});

describe("api - response handling", () => {
  it("returns parsed JSON on success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1", name: "x" }));
    const result = await api.get<{ id: string; name: string }>("/x");
    expect(result).toEqual({ id: "1", name: "x" });
  });

  it("returns undefined on 204 No Content", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, { status: 204 }));
    const result = await api.delete("/clients/1");
    expect(result).toBeUndefined();
  });

  it("throws Error with extracted error message when response not ok", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Client not found" }, { ok: false, status: 404 }),
    );
    await expect(api.get("/clients/nope")).rejects.toThrow("Client not found");
  });

  it("stringifies non-string error.error on failure", async () => {
    const validationErrors = [{ field: "name", msg: "required" }];
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: validationErrors }, { ok: false, status: 400 }),
    );
    await expect(api.post("/clients", {})).rejects.toThrow(
      JSON.stringify(validationErrors),
    );
  });

  it("falls back to 'Unknown error' when error JSON cannot be parsed", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("invalid json")),
    } as Response);
    await expect(api.get("/x")).rejects.toThrow("Unknown error");
  });
});
