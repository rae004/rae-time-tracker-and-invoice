import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimerControls } from "./TimerControls";
import { createTimeEntry, createProject, createCategoryTag } from "../test/fixtures";

const mockCreateAsync = vi.fn().mockResolvedValue({});
const mockStopAsync = vi.fn().mockResolvedValue({});
const mockInvalidate = vi.fn();
const mockShowToast = vi.fn();

let mockActiveEntry: ReturnType<typeof createTimeEntry> | null = null;

vi.mock("../hooks/useActiveTimer", () => ({
  useActiveTimer: () => ({
    activeEntry: mockActiveEntry,
    invalidate: mockInvalidate,
  }),
  useRunningDuration: () => 5000,
}));

vi.mock("../hooks/useTimeEntries", () => ({
  useCreateTimeEntry: () => ({ mutateAsync: mockCreateAsync, isPending: false }),
  useStopTimer: () => ({ mutateAsync: mockStopAsync, isPending: false }),
}));

vi.mock("../hooks/useProjects", () => ({
  useActiveProjects: () => ({
    data: {
      projects: [
        createProject({ id: "p1", name: "Project Alpha" }),
        createProject({ id: "p2", name: "Project Beta" }),
      ],
    },
  }),
}));

vi.mock("../hooks/useCategoryTags", () => ({
  useCategoryTags: () => ({
    data: {
      tags: [
        createCategoryTag({ id: "t1", name: "Dev" }),
      ],
    },
  }),
}));

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe("TimerControls - Start Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveEntry = null;
  });

  it("renders Start Timer heading and button", () => {
    render(<TimerControls />);
    expect(screen.getByRole("heading", { name: "Start Timer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start timer/i })).toBeInTheDocument();
  });

  it("renders project select dropdown", () => {
    render(<TimerControls />);
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("renders task name input", () => {
    render(<TimerControls />);
    expect(screen.getByPlaceholderText("Enter task description...")).toBeInTheDocument();
  });

  it("renders tag buttons", () => {
    render(<TimerControls />);
    expect(screen.getByText("Dev")).toBeInTheDocument();
  });

  it("calls createEntry.mutateAsync on Start click", async () => {
    const user = userEvent.setup();
    render(<TimerControls />);

    await user.click(screen.getByRole("button", { name: /start timer/i }));
    expect(mockCreateAsync).toHaveBeenCalled();
  });

  it("start button is always enabled (quick-start)", () => {
    render(<TimerControls />);
    const btn = screen.getByRole("button", { name: /start timer/i });
    expect(btn).not.toBeDisabled();
  });

  it("shows error toast when start fails", async () => {
    mockCreateAsync.mockRejectedValueOnce(new Error("fail"));
    const user = userEvent.setup();
    render(<TimerControls />);

    await user.click(screen.getByRole("button", { name: /start timer/i }));
    expect(mockShowToast).toHaveBeenCalledWith("Failed to start timer", "error");
  });

  it("starts timer on Enter key in name input", async () => {
    const user = userEvent.setup();
    render(<TimerControls />);

    const input = screen.getByPlaceholderText("Enter task description...");
    await user.click(input);
    await user.keyboard("{Enter}");
    expect(mockCreateAsync).toHaveBeenCalled();
  });

  it("toggles tag selection on click", async () => {
    const user = userEvent.setup();
    render(<TimerControls />);

    const tagBtn = screen.getByText("Dev");
    expect(tagBtn.className).toContain("badge-outline");

    await user.click(tagBtn);
    expect(tagBtn.className).toContain("badge-primary");

    await user.click(tagBtn);
    expect(tagBtn.className).toContain("badge-outline");
  });
});

describe("TimerControls - Running Timer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveEntry = createTimeEntry({
      name: "Active Task",
      is_running: true,
      end_time: null,
      duration_ms: null,
      tags: [createCategoryTag({ id: "t1", name: "Dev" })],
    });
  });

  it("renders active entry name", () => {
    render(<TimerControls />);
    expect(screen.getByText("Active Task")).toBeInTheDocument();
  });

  it("renders formatted duration", () => {
    render(<TimerControls />);
    expect(screen.getByText("0:00:05.000")).toBeInTheDocument();
  });

  it("renders Running badge", () => {
    render(<TimerControls />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("renders Stop Timer button", () => {
    render(<TimerControls />);
    expect(screen.getByRole("button", { name: /stop timer/i })).toBeInTheDocument();
  });

  it("calls stopTimer.mutateAsync on Stop click", async () => {
    const user = userEvent.setup();
    render(<TimerControls />);

    await user.click(screen.getByRole("button", { name: /stop timer/i }));
    expect(mockStopAsync).toHaveBeenCalled();
  });

  it("displays tags of active entry", () => {
    render(<TimerControls />);
    expect(screen.getByText("Dev")).toBeInTheDocument();
  });

  it("shows error toast when stop fails", async () => {
    mockStopAsync.mockRejectedValueOnce(new Error("fail"));
    const user = userEvent.setup();
    render(<TimerControls />);

    await user.click(screen.getByRole("button", { name: /stop timer/i }));
    expect(mockShowToast).toHaveBeenCalledWith("Failed to stop timer", "error");
  });

  it("shows 'No project assigned' when active entry has no project", () => {
    mockActiveEntry = createTimeEntry({
      name: "Unassigned Task",
      project_id: null,
      is_running: true,
      end_time: null,
      duration_ms: null,
      tags: [],
    });
    render(<TimerControls />);
    expect(screen.getByText("No project assigned")).toBeInTheDocument();
  });
});
