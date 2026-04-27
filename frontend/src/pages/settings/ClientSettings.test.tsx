import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientSettings } from "./ClientSettings";
import { createClient } from "../../test/fixtures";

const mockUseClients = vi.fn();
const mockCreateAsync = vi.fn();
const mockUpdateAsync = vi.fn();
const mockDeleteAsync = vi.fn();
const mockShowToast = vi.fn();

vi.mock("../../hooks/useClients", () => ({
  useClients: () => mockUseClients(),
  useCreateClient: () => ({
    mutateAsync: mockCreateAsync,
    isPending: false,
  }),
  useUpdateClient: () => ({
    mutateAsync: mockUpdateAsync,
    isPending: false,
  }),
  useDeleteClient: () => ({
    mutateAsync: mockDeleteAsync,
    isPending: false,
  }),
}));

vi.mock("../../components/settings/ProjectList", () => ({
  ProjectList: ({ clientId }: { clientId: string }) => (
    <div data-testid="project-list">{clientId}</div>
  ),
}));

vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => {
  mockUseClients.mockReset();
  mockCreateAsync.mockReset().mockResolvedValue(undefined);
  mockUpdateAsync.mockReset().mockResolvedValue(undefined);
  mockDeleteAsync.mockReset().mockResolvedValue(undefined);
  mockShowToast.mockReset();
});

describe("ClientSettings - states", () => {
  it("shows loading", () => {
    mockUseClients.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ClientSettings />);
    expect(container.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    mockUseClients.mockReturnValue({
      data: { clients: [], total: 0 },
      isLoading: false,
    });
    render(<ClientSettings />);
    expect(screen.getByText(/no clients yet/i)).toBeInTheDocument();
  });

  it("renders client cards", () => {
    mockUseClients.mockReturnValue({
      data: {
        clients: [
          createClient({ id: "c1", name: "Acme" }),
          createClient({ id: "c2", name: "Beta" }),
        ],
        total: 2,
      },
      isLoading: false,
    });
    render(<ClientSettings />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});

describe("ClientSettings - add form", () => {
  beforeEach(() => {
    mockUseClients.mockReturnValue({
      data: { clients: [], total: 0 },
      isLoading: false,
    });
  });

  it("opens add form on Add Client click", async () => {
    const user = userEvent.setup();
    render(<ClientSettings />);
    await user.click(screen.getByRole("button", { name: /add client/i }));
    expect(screen.getByText("Add New Client")).toBeInTheDocument();
  });

  it("creates a client when form is submitted", async () => {
    const user = userEvent.setup();
    render(<ClientSettings />);
    await user.click(screen.getByRole("button", { name: /add client/i }));

    // The form has multiple text inputs; fill the required ones by display value
    // (the dimensions vary by daisyUI). Find by required attribute which only applies
    // to mandatory fields.
    const inputs = screen.getAllByRole("textbox");
    // 0 is name, 1 is phone, then address_line1, address_line2, city, state, zip
    await user.type(inputs[0], "New Client");
    await user.type(inputs[2], "1 St");
    await user.type(inputs[4], "City");
    await user.type(inputs[5], "CA");
    await user.type(inputs[6], "12345");

    await user.click(screen.getByRole("button", { name: /create client/i }));

    await waitFor(() =>
      expect(mockCreateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Client" }),
      ),
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      "Client created successfully!",
      "success",
    );
  });

  it("cancels add form via Back button", async () => {
    const user = userEvent.setup();
    render(<ClientSettings />);
    await user.click(screen.getByRole("button", { name: /add client/i }));
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.queryByText("Add New Client")).toBeNull();
  });
});

describe("ClientSettings - edit & delete", () => {
  beforeEach(() => {
    mockUseClients.mockReturnValue({
      data: {
        clients: [createClient({ id: "c1", name: "Acme" })],
        total: 1,
      },
      isLoading: false,
    });
  });

  it("opens edit form with client values", async () => {
    const user = userEvent.setup();
    render(<ClientSettings />);
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    expect(screen.getByText("Edit Client")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Acme")).toBeInTheDocument();
  });

  it("submits update when editing existing client", async () => {
    const user = userEvent.setup();
    render(<ClientSettings />);
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    const nameInput = screen.getByDisplayValue("Acme");
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed");
    await user.click(screen.getByRole("button", { name: /update client/i }));

    await waitFor(() => {
      expect(mockUpdateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "c1",
          data: expect.objectContaining({ name: "Renamed" }),
        }),
      );
    });
  });

  it("deletes client when confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<ClientSettings />);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockDeleteAsync).toHaveBeenCalledWith("c1");
    vi.restoreAllMocks();
  });

  it("does not delete when cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ClientSettings />);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("shows error toast when delete fails", async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error("fail"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<ClientSettings />);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        "Failed to delete client",
        "error",
      ),
    );
    vi.restoreAllMocks();
  });

  it("expands ProjectList when client name area is clicked", async () => {
    const user = userEvent.setup();
    render(<ClientSettings />);
    await user.click(screen.getByText("Acme"));
    expect(screen.getByTestId("project-list")).toBeInTheDocument();
    expect(screen.getByTestId("project-list")).toHaveTextContent("c1");
  });
});
