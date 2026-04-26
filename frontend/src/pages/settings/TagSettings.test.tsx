import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagSettings } from "./TagSettings";
import { createCategoryTag } from "../../test/fixtures";

const mockUseTags = vi.fn();
const mockCreateAsync = vi.fn();
const mockUpdateAsync = vi.fn();
const mockDeleteAsync = vi.fn();
const mockShowToast = vi.fn();

vi.mock("../../hooks/useCategoryTags", () => ({
  useCategoryTags: () => mockUseTags(),
  useCreateCategoryTag: () => ({
    mutateAsync: mockCreateAsync,
    isPending: false,
  }),
  useUpdateCategoryTag: () => ({
    mutateAsync: mockUpdateAsync,
    isPending: false,
  }),
  useDeleteCategoryTag: () => ({
    mutateAsync: mockDeleteAsync,
    isPending: false,
  }),
}));

vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => {
  mockUseTags.mockReset();
  mockCreateAsync.mockReset().mockResolvedValue(undefined);
  mockUpdateAsync.mockReset().mockResolvedValue(undefined);
  mockDeleteAsync.mockReset().mockResolvedValue(undefined);
  mockShowToast.mockReset();
});

describe("TagSettings - states", () => {
  it("shows loading", () => {
    mockUseTags.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<TagSettings />);
    expect(container.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("shows empty state when no tags", () => {
    mockUseTags.mockReturnValue({
      data: { tags: [], total: 0 },
      isLoading: false,
    });
    render(<TagSettings />);
    expect(screen.getByText(/no tags yet/i)).toBeInTheDocument();
  });

  it("renders existing tags", () => {
    mockUseTags.mockReturnValue({
      data: {
        tags: [
          createCategoryTag({ id: "t1", name: "Dev" }),
          createCategoryTag({ id: "t2", name: "Design" }),
        ],
        total: 2,
      },
      isLoading: false,
    });
    render(<TagSettings />);
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
  });
});

describe("TagSettings - create", () => {
  beforeEach(() => {
    mockUseTags.mockReturnValue({
      data: { tags: [], total: 0 },
      isLoading: false,
    });
  });

  it("opens add form on Add Tag click", async () => {
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /add tag/i }));
    expect(screen.getByText("New Tag")).toBeInTheDocument();
  });

  it("creates a tag with entered name", async () => {
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /add tag/i }));
    const input = screen.getByPlaceholderText(/development/i);
    await user.type(input, "Backend");
    await user.click(screen.getByRole("button", { name: /create tag/i }));

    await waitFor(() => {
      expect(mockCreateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Backend" }),
      );
    });
    expect(mockShowToast).toHaveBeenCalledWith("Tag created!", "success");
  });

  it("disables Create button when name is empty", async () => {
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /add tag/i }));
    const createBtn = screen.getByRole("button", { name: /create tag/i });
    expect(createBtn).toBeDisabled();
  });

  it("cancels add form", async () => {
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /add tag/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("New Tag")).toBeNull();
  });

  it("shows error toast when create fails", async () => {
    mockCreateAsync.mockRejectedValueOnce(new Error("fail"));
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /add tag/i }));
    await user.type(screen.getByPlaceholderText(/development/i), "X");
    await user.click(screen.getByRole("button", { name: /create tag/i }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        "Failed to create tag",
        "error",
      ),
    );
  });
});

describe("TagSettings - edit & delete", () => {
  beforeEach(() => {
    mockUseTags.mockReturnValue({
      data: {
        tags: [createCategoryTag({ id: "t1", name: "Dev", color: "#3B82F6" })],
        total: 1,
      },
      isLoading: false,
    });
  });

  it("opens edit form with current values", async () => {
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    expect(screen.getByText("Edit Tag")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dev")).toBeInTheDocument();
  });

  it("calls update on Save", async () => {
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    const input = screen.getByDisplayValue("Dev");
    await user.clear(input);
    await user.type(input, "Backend");
    await user.click(screen.getByRole("button", { name: /update tag/i }));

    await waitFor(() => {
      expect(mockUpdateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "t1",
          data: expect.objectContaining({ name: "Backend" }),
        }),
      );
    });
  });

  it("deletes tag when confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockDeleteAsync).toHaveBeenCalledWith("t1");
    vi.restoreAllMocks();
  });

  it("does not delete when cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("shows error toast when delete fails", async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error("fail"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<TagSettings />);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        "Failed to delete tag",
        "error",
      ),
    );
    vi.restoreAllMocks();
  });
});
