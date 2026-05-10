import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataManagement } from "./DataManagement";
import type { DataExport } from "../../types";

const mockExportAsync = vi.fn();
const mockImportAsync = vi.fn();
const mockResetAsync = vi.fn();
const mockShowToast = vi.fn();
const mockParseExportFile = vi.fn();

vi.mock("../../hooks/useDataManagement", () => ({
  useExportData: () => ({ mutateAsync: mockExportAsync, isPending: false }),
  useImportData: () => ({ mutateAsync: mockImportAsync, isPending: false }),
  useResetData: () => ({ mutateAsync: mockResetAsync, isPending: false }),
  parseExportFile: (...a: unknown[]) => mockParseExportFile(...a),
  RESET_CONFIRM_HEADER: "X-Confirm-Reset",
  RESET_CONFIRM_VALUE: "DELETE-ALL-DATA",
}));

vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const samplePayload: DataExport = {
  export_version: "1.0",
  export_date: "2026-05-10T00:00:00Z",
  data: {
    user_profile: {
      name: "Jane",
      address_line1: "1 St",
      address_line2: null,
      city: "C",
      state: "S",
      zip_code: "0",
      email: "j@x.com",
      phone: "555",
      payment_instructions: "",
      next_invoice_number: 1,
    },
    category_tags: [{ name: "Dev", color: "#fff" }],
    clients: [],
    projects: [],
    time_entries: [],
    invoices: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockExportAsync.mockResolvedValue({ payload: samplePayload, filename: "x.json" });
  mockImportAsync.mockResolvedValue({
    success: true,
    counts: {
      user_profile_created: 1,
      user_profile_skipped: 0,
      category_tags_created: 1,
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
  });
  mockResetAsync.mockResolvedValue({
    success: true,
    deleted: { clients: 2, projects: 0, time_entries: 0, invoices: 0, invoice_line_items: 0, category_tags: 0, user_profiles: 0 },
  });
  mockParseExportFile.mockResolvedValue(samplePayload);
});

describe("DataManagement", () => {
  it("renders the three sections", () => {
    render(<DataManagement />);
    expect(screen.getByRole("heading", { name: /Data Management/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Export$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Import$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Danger Zone/ })).toBeInTheDocument();
  });

  it("triggers export on button click", async () => {
    const user = userEvent.setup();
    render(<DataManagement />);
    await user.click(screen.getByRole("button", { name: /Export Data/ }));
    expect(mockExportAsync).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith("Export downloaded!", "success");
  });

  it("shows toast on export error", async () => {
    mockExportAsync.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();
    render(<DataManagement />);
    await user.click(screen.getByRole("button", { name: /Export Data/ }));
    expect(mockShowToast).toHaveBeenCalledWith("network", "error");
  });

  it("parses file and shows preview, then imports on confirm", async () => {
    const user = userEvent.setup();
    render(<DataManagement />);

    const fileInput = screen.getByLabelText("Import file") as HTMLInputElement;
    const file = new File([JSON.stringify(samplePayload)], "export.json", {
      type: "application/json",
    });
    await user.upload(fileInput, file);

    expect(await screen.findByText(/Ready to import/)).toBeInTheDocument();
    expect(screen.getByText("1 user profile")).toBeInTheDocument();
    expect(screen.getByText("1 category tags")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Confirm Import/ }));
    expect(mockImportAsync).toHaveBeenCalledWith(samplePayload);
    expect(mockShowToast).toHaveBeenCalledWith("Imported 2 items.", "success");
  });

  it("shows error when file is invalid", async () => {
    mockParseExportFile.mockRejectedValueOnce(new Error("not a Rae export"));
    const user = userEvent.setup();
    render(<DataManagement />);

    const fileInput = screen.getByLabelText("Import file") as HTMLInputElement;
    const file = new File(["junk"], "bad.json");
    await user.upload(fileInput, file);

    expect(await screen.findByRole("alert")).toHaveTextContent(/not a Rae export/);
  });

  it("cancels pending import when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<DataManagement />);

    const fileInput = screen.getByLabelText("Import file") as HTMLInputElement;
    const file = new File([JSON.stringify(samplePayload)], "export.json");
    await user.upload(fileInput, file);

    expect(await screen.findByText(/Ready to import/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Cancel$/ }));
    expect(screen.queryByText(/Ready to import/)).toBeNull();
  });

  it("requires typing DELETE before reset is enabled", async () => {
    const user = userEvent.setup();
    render(<DataManagement />);

    await user.click(screen.getByRole("button", { name: /Reset All Data/ }));
    const dialog = screen.getByRole("dialog", { hidden: true }) ??
      screen.getByText(/Reset all data\?/).closest(".modal-box")!;

    const confirmInput = screen.getByLabelText("Reset confirmation");
    const deleteBtn = screen.getByRole("button", { name: /Delete Everything/ });
    expect(deleteBtn).toBeDisabled();

    await user.type(confirmInput, "wrong");
    expect(deleteBtn).toBeDisabled();

    await user.clear(confirmInput);
    await user.type(confirmInput, "DELETE");
    expect(deleteBtn).not.toBeDisabled();

    await user.click(deleteBtn);
    expect(mockResetAsync).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith("Deleted 2 records.", "success");

    void dialog;
  });

  it("cancels reset modal", async () => {
    const user = userEvent.setup();
    render(<DataManagement />);

    await user.click(screen.getByRole("button", { name: /Reset All Data/ }));
    const cancelBtn = within(
      screen.getByText(/Reset all data\?/).closest(".modal-box") as HTMLElement,
    ).getByRole("button", { name: /Cancel/ });
    await user.click(cancelBtn);
    expect(screen.queryByText(/Reset all data\?/)).toBeNull();
    expect(mockResetAsync).not.toHaveBeenCalled();
  });

  it("shows toast on import failure", async () => {
    mockImportAsync.mockRejectedValueOnce(new Error("bad data"));
    const user = userEvent.setup();
    render(<DataManagement />);

    const fileInput = screen.getByLabelText("Import file") as HTMLInputElement;
    const file = new File([JSON.stringify(samplePayload)], "export.json");
    await user.upload(fileInput, file);
    await user.click(await screen.findByRole("button", { name: /Confirm Import/ }));
    expect(mockShowToast).toHaveBeenCalledWith("bad data", "error");
  });

  it("shows toast on reset failure", async () => {
    mockResetAsync.mockRejectedValueOnce(new Error("denied"));
    const user = userEvent.setup();
    render(<DataManagement />);

    await user.click(screen.getByRole("button", { name: /Reset All Data/ }));
    await user.type(screen.getByLabelText("Reset confirmation"), "DELETE");
    await user.click(screen.getByRole("button", { name: /Delete Everything/ }));
    expect(mockShowToast).toHaveBeenCalledWith("denied", "error");
  });
});
