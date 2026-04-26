import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { InvoiceDetail } from "./InvoiceDetail";
import { createInvoice, createClient } from "../test/fixtures";

const mockUseInvoice = vi.fn();
const mockUseClient = vi.fn();
const mockFinalizeAsync = vi.fn();
const mockDeleteAsync = vi.fn();
const mockShowToast = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../hooks/useInvoices", () => ({
  useInvoice: () => mockUseInvoice(),
  useFinalizeInvoice: () => ({
    mutateAsync: mockFinalizeAsync,
    isPending: false,
  }),
  useDeleteInvoice: () => ({
    mutateAsync: mockDeleteAsync,
    isPending: false,
  }),
  getInvoicePdfUrl: (id: string) => `/api/invoices/${id}/pdf`,
}));

vi.mock("../hooks/useClients", () => ({
  useClient: () => mockUseClient(),
}));

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

function renderDetail(invoiceId = "inv-1") {
  return render(
    <MemoryRouter initialEntries={[`/invoices/${invoiceId}`]}>
      <Routes>
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseInvoice.mockReset();
  mockUseClient.mockReset().mockReturnValue({ data: createClient() });
  mockFinalizeAsync.mockReset().mockResolvedValue(undefined);
  mockDeleteAsync.mockReset().mockResolvedValue(undefined);
  mockShowToast.mockReset();
  mockNavigate.mockReset();
});

describe("InvoiceDetail - states", () => {
  it("shows loading spinner", () => {
    mockUseInvoice.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderDetail();
    expect(container.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("shows not-found state when invoice missing", () => {
    mockUseInvoice.mockReturnValue({ data: null, isLoading: false });
    renderDetail();
    expect(screen.getByText("Invoice not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to invoices/i }),
    ).toBeInTheDocument();
  });

  it("renders invoice number and status badge", () => {
    mockUseInvoice.mockReturnValue({
      data: createInvoice({ invoice_number: 42, status: "draft" }),
      isLoading: false,
    });
    renderDetail();
    expect(screen.getByText("Invoice #42")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });
});

describe("InvoiceDetail - draft actions", () => {
  beforeEach(() => {
    mockUseInvoice.mockReturnValue({
      data: createInvoice({ id: "d1", invoice_number: 5, status: "draft" }),
      isLoading: false,
    });
  });

  it("shows Delete and Finalize buttons", () => {
    renderDetail("d1");
    expect(
      screen.getByRole("button", { name: /^delete$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /finalize.*pdf/i }),
    ).toBeInTheDocument();
  });

  it("calls finalize when confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderDetail("d1");
    await user.click(screen.getByRole("button", { name: /finalize/i }));
    expect(mockFinalizeAsync).toHaveBeenCalledWith("d1");
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringMatching(/finalized/i),
      "success",
    );
    vi.restoreAllMocks();
  });

  it("does not finalize when cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderDetail("d1");
    await user.click(screen.getByRole("button", { name: /finalize/i }));
    expect(mockFinalizeAsync).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("shows error toast when finalize fails", async () => {
    mockFinalizeAsync.mockRejectedValueOnce(new Error("fail"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderDetail("d1");
    await user.click(screen.getByRole("button", { name: /finalize/i }));
    expect(mockShowToast).toHaveBeenCalledWith(
      "Failed to finalize invoice",
      "error",
    );
    vi.restoreAllMocks();
  });

  it("calls delete and navigates when confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderDetail("d1");
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockDeleteAsync).toHaveBeenCalledWith("d1");
    expect(mockNavigate).toHaveBeenCalledWith("/invoices");
    vi.restoreAllMocks();
  });

  it("shows error toast when delete fails", async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error("fail"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderDetail("d1");
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockShowToast).toHaveBeenCalledWith(
      "Failed to delete invoice",
      "error",
    );
    vi.restoreAllMocks();
  });
});

describe("InvoiceDetail - finalized actions", () => {
  it("shows PDF download link", () => {
    mockUseInvoice.mockReturnValue({
      data: createInvoice({
        id: "f1",
        status: "finalized",
        pdf_path: "/x.pdf",
      }),
      isLoading: false,
    });
    renderDetail("f1");
    const link = screen.getByRole("link", { name: /download pdf/i });
    expect(link).toHaveAttribute("href", "/api/invoices/f1/pdf");
  });

  it("hides Delete and Finalize buttons", () => {
    mockUseInvoice.mockReturnValue({
      data: createInvoice({ status: "finalized", pdf_path: "/x.pdf" }),
      isLoading: false,
    });
    renderDetail();
    expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /finalize/i })).toBeNull();
  });
});

describe("InvoiceDetail - client info & totals", () => {
  it("shows client info when loaded", () => {
    mockUseInvoice.mockReturnValue({
      data: createInvoice(),
      isLoading: false,
    });
    mockUseClient.mockReturnValue({
      data: createClient({ name: "Beta Co", city: "Boston", state: "MA" }),
    });
    renderDetail();
    expect(screen.getByText("Beta Co")).toBeInTheDocument();
    expect(screen.getByText(/Boston, MA/)).toBeInTheDocument();
  });

  it("shows loading client placeholder when client is undefined", () => {
    mockUseInvoice.mockReturnValue({
      data: createInvoice(),
      isLoading: false,
    });
    mockUseClient.mockReturnValue({ data: undefined });
    renderDetail();
    expect(screen.getByText("Loading client info...")).toBeInTheDocument();
  });

  it("shows tax line only when tax > 0", () => {
    mockUseInvoice.mockReturnValue({
      data: createInvoice({ tax_rate: "0.10", subtotal: "100.00" }),
      isLoading: false,
    });
    renderDetail();
    expect(screen.getByText(/Tax Amount/i)).toBeInTheDocument();
  });

  it("hides tax line when tax is 0", () => {
    mockUseInvoice.mockReturnValue({
      data: createInvoice({ tax_rate: "0.0000", subtotal: "100.00" }),
      isLoading: false,
    });
    renderDetail();
    expect(screen.queryByText(/Tax Amount/i)).toBeNull();
  });
});

describe("InvoiceDetail - back navigation", () => {
  it("navigates to /invoices when Back is clicked", async () => {
    mockUseInvoice.mockReturnValue({
      data: createInvoice(),
      isLoading: false,
    });
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/invoices");
  });
});
