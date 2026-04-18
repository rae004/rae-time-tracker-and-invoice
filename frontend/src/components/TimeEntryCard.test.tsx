import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeEntryCard } from "./TimeEntryCard";
import { createTimeEntry, createCategoryTag, createProject } from "../test/fixtures";

const mockMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteAsync = vi.fn().mockResolvedValue({});
const mockShowToast = vi.fn();

vi.mock("../hooks/useTimeEntries", () => ({
  useUpdateTimeEntry: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useDeleteTimeEntry: () => ({ mutateAsync: mockDeleteAsync, isPending: false }),
}));

vi.mock("../hooks/useProjects", () => ({
  useActiveProjects: () => ({
    data: {
      projects: [
        createProject({ id: "project-1", name: "My Project" }),
        createProject({ id: "project-2", name: "Other Project" }),
      ],
    },
  }),
}));

vi.mock("../hooks/useCategoryTags", () => ({
  useCategoryTags: () => ({
    data: {
      tags: [
        createCategoryTag({ id: "tag-1", name: "Development" }),
        createCategoryTag({ id: "tag-2", name: "Research" }),
      ],
    },
  }),
}));

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe("TimeEntryCard - View Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders entry name", () => {
    render(<TimeEntryCard entry={createTimeEntry({ name: "Fix bug #42" })} />);
    expect(screen.getByText("Fix bug #42")).toBeInTheDocument();
  });

  it("renders project name", () => {
    render(<TimeEntryCard entry={createTimeEntry({ project_name: "My Project" })} />);
    expect(screen.getByText("My Project")).toBeInTheDocument();
  });

  it("renders 'No project' when project_name is null", () => {
    render(<TimeEntryCard entry={createTimeEntry({ project_name: null })} />);
    expect(screen.getByText("No project")).toBeInTheDocument();
  });

  it("renders client name when present", () => {
    render(<TimeEntryCard entry={createTimeEntry({ client_name: "Acme Corp" })} />);
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it("renders formatted duration", () => {
    render(<TimeEntryCard entry={createTimeEntry({ duration_ms: 3661456 })} />);
    expect(screen.getByText("1:01:01.456")).toBeInTheDocument();
  });

  it("renders tags", () => {
    const tags = [
      createCategoryTag({ id: "t1", name: "Backend" }),
      createCategoryTag({ id: "t2", name: "Frontend" }),
    ];
    render(<TimeEntryCard entry={createTimeEntry({ tags })} />);
    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("shows Running badge when entry is running", () => {
    render(
      <TimeEntryCard
        entry={createTimeEntry({ is_running: true, end_time: null, duration_ms: null })}
      />,
    );
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("shows time range when showDate is true", () => {
    render(
      <TimeEntryCard
        entry={createTimeEntry()}
        showDate={true}
      />,
    );
    const timeElements = screen.getAllByText(/AM|PM/);
    expect(timeElements.length).toBeGreaterThan(0);
  });
});

describe("TimeEntryCard - Edit Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enters edit mode when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(<TimeEntryCard entry={createTimeEntry()} />);

    await user.click(screen.getByText("Edit"));
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("populates form with current entry values", async () => {
    const user = userEvent.setup();
    render(<TimeEntryCard entry={createTimeEntry({ name: "My Task" })} />);

    await user.click(screen.getByText("Edit"));
    const nameInput = screen.getByDisplayValue("My Task");
    expect(nameInput).toBeInTheDocument();
  });

  it("resets form values when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<TimeEntryCard entry={createTimeEntry({ name: "Original" })} />);

    await user.click(screen.getByText("Edit"));
    const nameInput = screen.getByDisplayValue("Original");
    await user.clear(nameInput);
    await user.type(nameInput, "Changed");

    await user.click(screen.getByText("Cancel"));
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("calls mutateAsync with correct payload on Save", async () => {
    const user = userEvent.setup();
    const entry = createTimeEntry({ id: "entry-123", name: "Old Name" });
    render(<TimeEntryCard entry={entry} />);

    await user.click(screen.getByText("Edit"));
    const nameInput = screen.getByDisplayValue("Old Name");
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");
    await user.click(screen.getByText("Save"));

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "entry-123",
        data: expect.objectContaining({ name: "New Name" }),
      }),
    );
  });

  it("calls delete after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TimeEntryCard entry={createTimeEntry({ id: "entry-del" })} />);

    await user.click(screen.getByText("Delete"));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteAsync).toHaveBeenCalledWith("entry-del");
    vi.restoreAllMocks();
  });

  it("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<TimeEntryCard entry={createTimeEntry()} />);

    await user.click(screen.getByText("Delete"));

    expect(mockDeleteAsync).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("shows error toast when save fails", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();
    render(<TimeEntryCard entry={createTimeEntry({ name: "Task" })} />);

    await user.click(screen.getByText("Edit"));
    await user.click(screen.getByText("Save"));

    expect(mockShowToast).toHaveBeenCalledWith("Failed to update entry", "error");
  });

  it("shows error toast when delete fails", async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error("Network error"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<TimeEntryCard entry={createTimeEntry()} />);

    await user.click(screen.getByText("Delete"));

    expect(mockShowToast).toHaveBeenCalledWith("Failed to delete entry", "error");
    vi.restoreAllMocks();
  });

  it("toggles tags on and off in edit mode", async () => {
    const user = userEvent.setup();
    render(<TimeEntryCard entry={createTimeEntry({ tags: [] })} />);

    await user.click(screen.getByText("Edit"));

    const devTag = screen.getByText("Development");
    await user.click(devTag);
    expect(devTag.className).toContain("badge-primary");

    await user.click(devTag);
    expect(devTag.className).toContain("badge-outline");
  });

  it("does not show time range when showDate is false", () => {
    render(
      <TimeEntryCard
        entry={createTimeEntry({
          start_time: "2026-04-11T14:00:00.000Z",
          end_time: "2026-04-11T15:30:00.000Z",
        })}
        showDate={false}
      />,
    );
    const timeElements = screen.queryAllByText(/AM|PM/);
    expect(timeElements).toHaveLength(0);
  });

  it("does not show end time when entry has no end_time", () => {
    render(
      <TimeEntryCard
        entry={createTimeEntry({ end_time: null, is_running: true, duration_ms: null })}
        showDate={true}
      />,
    );
    const timeTexts = screen.getAllByText(/AM|PM/);
    expect(timeTexts).toHaveLength(1);
  });
});
