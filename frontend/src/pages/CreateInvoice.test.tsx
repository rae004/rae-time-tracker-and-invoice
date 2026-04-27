import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CreateInvoice } from "./CreateInvoice";
import { createClient, createInvoice } from "../test/fixtures";
import type { InvoicePreview } from "../types";

const mockUseClients = vi.fn();
const mockPreviewMutate = vi.fn();
const mockCreateAsync = vi.fn();
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

vi.mock("../hooks/useClients", () => ({
  useClients: () => mockUseClients(),
}));

vi.mock("../hooks/useInvoices", () => ({
  useInvoicePreview: () => ({
    mutate: mockPreviewMutate,
    isPending: false,
  }),
  useCreateInvoice: () => ({
    mutateAsync: mockCreateAsync,
    isPending: false,
  }),
}));

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

function buildPreview(overrides?: Partial<InvoicePreview>): InvoicePreview {
  return {
    client_id: "client-1",
    client_name: "Acme Corp",
    period_start: "2026-04-01",
    period_end: "2026-04-27",
    hourly_rate: "150.00",
    line_items: [
      {
        time_entry_id: "te-1",
        project_name: "Project A",
        work_date: "2026-04-15",
        hours: "1.5000",
        amount: "225.00",
        sort_order: 0,
      },
    ],
    subtotal: "225.00",
    tax_rate: "0.0000",
    other_charges: "0.00",
    total: "225.00",
    ...overrides,
  };
}

function renderCreate() {
  return render(
    <MemoryRouter>
      <CreateInvoice />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseClients.mockReset().mockReturnValue({
    data: { clients: [createClient({ id: "client-1", name: "Acme Corp" })] },
    isLoading: false,
  });
  mockPreviewMutate.mockReset();
  mockCreateAsync.mockReset().mockResolvedValue(createInvoice({ id: "new-inv" }));
  mockShowToast.mockReset();
  mockNavigate.mockReset();
});

describe("CreateInvoice - states", () => {
  it("shows loading spinner while clients load", () => {
    mockUseClients.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderCreate();
    expect(container.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("renders heading and client dropdown", () => {
    renderCreate();
    expect(
      screen.getByRole("heading", { name: "Create Invoice" }),
    ).toBeInTheDocument();
    // Default option text in the select dropdown
    expect(screen.getByRole("option", { name: /select a client\.\.\./i }))
      .toBeInTheDocument();
  });

  it("renders client options", () => {
    renderCreate();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
  });
});

describe("CreateInvoice - preview loading", () => {
  it("does not call preview when no client selected", () => {
    renderCreate();
    expect(mockPreviewMutate).not.toHaveBeenCalled();
  });

  it("calls preview after client is selected", async () => {
    const user = userEvent.setup();
    renderCreate();

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "client-1");

    await waitFor(() => expect(mockPreviewMutate).toHaveBeenCalled());
    const args = mockPreviewMutate.mock.calls[0][0];
    expect(args.client_id).toBe("client-1");
  });

  it("shows 'Select a client' empty preview state", () => {
    renderCreate();
    expect(
      screen.getByText(/select a client to preview/i),
    ).toBeInTheDocument();
  });
});

describe("CreateInvoice - preview rendered", () => {
  beforeEach(() => {
    mockPreviewMutate.mockImplementation((_data, options) => {
      options?.onSuccess?.(buildPreview());
    });
  });

  it("renders line items after preview success", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.selectOptions(screen.getByRole("combobox"), "client-1");

    await waitFor(() => {
      expect(screen.getByText("Project A")).toBeInTheDocument();
    });
  });

  it("toggles entry exclusion via checkbox", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.selectOptions(screen.getByRole("combobox"), "client-1");

    await waitFor(() => screen.getByText("Project A"));
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("calls createInvoice and navigates on Create Draft", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.selectOptions(screen.getByRole("combobox"), "client-1");
    await waitFor(() => screen.getByText("Project A"));

    await user.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => expect(mockCreateAsync).toHaveBeenCalled());
    expect(mockShowToast).toHaveBeenCalledWith("Invoice created!", "success");
    expect(mockNavigate).toHaveBeenCalledWith("/invoices/new-inv");
  });

  it("shows error toast when createInvoice fails", async () => {
    mockCreateAsync.mockRejectedValueOnce(new Error("fail"));
    const user = userEvent.setup();
    renderCreate();
    await user.selectOptions(screen.getByRole("combobox"), "client-1");
    await waitFor(() => screen.getByText("Project A"));

    await user.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        "Failed to create invoice",
        "error",
      ),
    );
  });

  it("warns when all items are excluded", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.selectOptions(screen.getByRole("combobox"), "client-1");
    await waitFor(() => screen.getByText("Project A"));

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create draft/i }));

    expect(mockShowToast).toHaveBeenCalledWith(
      "No line items to invoice",
      "error",
    );
  });
});

describe("CreateInvoice - tax/other charges", () => {
  beforeEach(() => {
    mockPreviewMutate.mockImplementation((_data, options) => {
      options?.onSuccess?.(buildPreview());
    });
  });

  it("updates tax rate input value when changed", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.selectOptions(screen.getByRole("combobox"), "client-1");
    await waitFor(() => screen.getByText("Project A"));

    // The form has two number inputs: Tax Rate (first) and Other Charges (second).
    // The labels aren't associated via htmlFor, so we select by role + position.
    const numberInputs = screen.getAllByRole("spinbutton");
    const taxInput = numberInputs[0];
    await user.clear(taxInput);
    await user.type(taxInput, "10");

    expect(taxInput).toHaveValue(10);
  });
});

describe("CreateInvoice - Back navigation", () => {
  it("navigates to /invoices when Back clicked", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/invoices");
  });
});

describe("CreateInvoice - empty preview", () => {
  it("shows 'no completed time entries' when preview has no items", async () => {
    mockPreviewMutate.mockImplementation((_data, options) => {
      options?.onSuccess?.(buildPreview({ line_items: [], subtotal: "0", total: "0" }));
    });
    const user = userEvent.setup();
    renderCreate();
    await user.selectOptions(screen.getByRole("combobox"), "client-1");

    await waitFor(() => {
      expect(
        screen.getByText(/no completed time entries/i),
      ).toBeInTheDocument();
    });
  });
});
