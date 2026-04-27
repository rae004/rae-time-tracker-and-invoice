import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Invoices } from "./Invoices";
import { createInvoiceWithClient } from "../test/fixtures";

const mockUseInvoices = vi.fn();
const mockDeleteAsync = vi.fn();
const mockShowToast = vi.fn();

vi.mock("../hooks/useInvoices", () => ({
  useInvoices: () => mockUseInvoices(),
  useDeleteInvoice: () => ({ mutateAsync: mockDeleteAsync, isPending: false }),
  getInvoicePdfUrl: (id: string) => `/api/invoices/${id}/pdf`,
}));

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

function renderInvoices() {
  return render(
    <MemoryRouter>
      <Invoices />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockDeleteAsync.mockReset().mockResolvedValue(undefined);
  mockShowToast.mockReset();
});

describe("Invoices - states", () => {
  it("shows loading spinner while loading", () => {
    mockUseInvoices.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderInvoices();
    expect(container.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("shows empty state when no invoices", () => {
    mockUseInvoices.mockReturnValue({
      data: { invoices: [], total: 0 },
      isLoading: false,
    });
    renderInvoices();
    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create invoice/i }),
    ).toBeInTheDocument();
  });

  it("renders invoice rows", () => {
    mockUseInvoices.mockReturnValue({
      data: {
        invoices: [
          createInvoiceWithClient({
            id: "i1",
            invoice_number: 1,
            client_name: "Acme Corp",
            total: "500.00",
            status: "draft",
          }),
        ],
        total: 1,
      },
      isLoading: false,
    });
    renderInvoices();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("shows 'Unknown' when client_name is null", () => {
    mockUseInvoices.mockReturnValue({
      data: {
        invoices: [createInvoiceWithClient({ client_name: null })],
        total: 1,
      },
      isLoading: false,
    });
    renderInvoices();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});

describe("Invoices - status-conditional buttons", () => {
  it("shows Delete button only for draft invoices", () => {
    mockUseInvoices.mockReturnValue({
      data: {
        invoices: [
          createInvoiceWithClient({ id: "d1", status: "draft" }),
          createInvoiceWithClient({
            id: "f1",
            status: "finalized",
            pdf_path: "/x.pdf",
          }),
        ],
        total: 2,
      },
      isLoading: false,
    });
    renderInvoices();
    expect(screen.getAllByText("Delete")).toHaveLength(1);
  });

  it("shows PDF link only for finalized with pdf_path", () => {
    mockUseInvoices.mockReturnValue({
      data: {
        invoices: [
          createInvoiceWithClient({ id: "d1", status: "draft" }),
          createInvoiceWithClient({
            id: "f1",
            status: "finalized",
            pdf_path: "/x.pdf",
          }),
          createInvoiceWithClient({
            id: "f2",
            status: "finalized",
            pdf_path: null,
          }),
        ],
        total: 3,
      },
      isLoading: false,
    });
    renderInvoices();
    expect(screen.getAllByText("PDF")).toHaveLength(1);
  });
});

describe("Invoices - delete flow", () => {
  beforeEach(() => {
    mockUseInvoices.mockReturnValue({
      data: {
        invoices: [
          createInvoiceWithClient({
            id: "del1",
            invoice_number: 99,
            status: "draft",
          }),
        ],
        total: 1,
      },
      isLoading: false,
    });
  });

  it("calls deleteInvoice when confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderInvoices();
    await user.click(screen.getByText("Delete"));
    expect(mockDeleteAsync).toHaveBeenCalledWith("del1");
    expect(mockShowToast).toHaveBeenCalledWith("Invoice deleted", "success");
    vi.restoreAllMocks();
  });

  it("does not call deleteInvoice when cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderInvoices();
    await user.click(screen.getByText("Delete"));
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("shows error toast when delete fails", async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error("fail"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderInvoices();
    await user.click(screen.getByText("Delete"));
    expect(mockShowToast).toHaveBeenCalledWith(
      "Failed to delete invoice",
      "error",
    );
    vi.restoreAllMocks();
  });
});
