import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectList } from "./ProjectList";
import { createProject } from "../../test/fixtures";

const mockUseProjects = vi.fn();
const mockCreateAsync = vi.fn();
const mockUpdateAsync = vi.fn();
const mockDeleteAsync = vi.fn();
const mockShowToast = vi.fn();

vi.mock("../../hooks/useProjects", () => ({
  useProjects: () => mockUseProjects(),
  useCreateProject: () => ({
    mutateAsync: mockCreateAsync,
    isPending: false,
  }),
  useUpdateProject: () => ({
    mutateAsync: mockUpdateAsync,
    isPending: false,
  }),
  useDeleteProject: () => ({
    mutateAsync: mockDeleteAsync,
    isPending: false,
  }),
}));

vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => {
  mockUseProjects.mockReset();
  mockCreateAsync.mockReset().mockResolvedValue(undefined);
  mockUpdateAsync.mockReset().mockResolvedValue(undefined);
  mockDeleteAsync.mockReset().mockResolvedValue(undefined);
  mockShowToast.mockReset();
});

describe("ProjectList - states", () => {
  it("shows loading", () => {
    mockUseProjects.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ProjectList clientId="c1" />);
    expect(container.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("shows 'No projects yet' when empty", () => {
    mockUseProjects.mockReturnValue({
      data: { projects: [], total: 0 },
      isLoading: false,
    });
    render(<ProjectList clientId="c1" />);
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  it("renders existing projects", () => {
    mockUseProjects.mockReturnValue({
      data: {
        projects: [
          createProject({ id: "p1", name: "Project A" }),
          createProject({ id: "p2", name: "Project B" }),
        ],
        total: 2,
      },
      isLoading: false,
    });
    render(<ProjectList clientId="c1" />);
    expect(screen.getByText("Project A")).toBeInTheDocument();
    expect(screen.getByText("Project B")).toBeInTheDocument();
  });

  it("marks inactive projects with badge", () => {
    mockUseProjects.mockReturnValue({
      data: {
        projects: [createProject({ id: "p1", is_active: false })],
        total: 1,
      },
      isLoading: false,
    });
    render(<ProjectList clientId="c1" />);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});

describe("ProjectList - create", () => {
  beforeEach(() => {
    mockUseProjects.mockReturnValue({
      data: { projects: [], total: 0 },
      isLoading: false,
    });
  });

  it("creates project with name", async () => {
    const user = userEvent.setup();
    render(<ProjectList clientId="c1" />);
    await user.click(screen.getByRole("button", { name: /add project/i }));
    await user.type(screen.getByPlaceholderText(/project name/i), "P-new");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() =>
      expect(mockCreateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: "P-new", client_id: "c1" }),
      ),
    );
  });

  it("disables Add button when name is empty", async () => {
    const user = userEvent.setup();
    render(<ProjectList clientId="c1" />);
    await user.click(screen.getByRole("button", { name: /add project/i }));
    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled();
  });
});

describe("ProjectList - edit/toggle/delete", () => {
  beforeEach(() => {
    mockUseProjects.mockReturnValue({
      data: {
        projects: [
          createProject({ id: "p1", name: "Active P", is_active: true }),
        ],
        total: 1,
      },
      isLoading: false,
    });
  });

  it("opens edit form with current values", async () => {
    const user = userEvent.setup();
    render(<ProjectList clientId="c1" />);
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    expect(screen.getByDisplayValue("Active P")).toBeInTheDocument();
  });

  it("toggles active status", async () => {
    const user = userEvent.setup();
    render(<ProjectList clientId="c1" />);
    await user.click(screen.getByRole("button", { name: /^deactivate$/i }));
    await waitFor(() =>
      expect(mockUpdateAsync).toHaveBeenCalledWith({
        id: "p1",
        data: { is_active: false },
      }),
    );
  });

  it("deletes when confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<ProjectList clientId="c1" />);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockDeleteAsync).toHaveBeenCalledWith("p1");
    vi.restoreAllMocks();
  });

  it("does not delete when cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ProjectList clientId="c1" />);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
