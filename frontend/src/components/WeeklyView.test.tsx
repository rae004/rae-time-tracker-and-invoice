import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeeklyView } from "./WeeklyView";
import { createTimeEntry } from "../test/fixtures";

const mockUseWeeklyEntries = vi.fn();

vi.mock("../hooks/useTimeEntries", () => ({
  useWeeklyEntries: (...args: unknown[]) => mockUseWeeklyEntries(...args),
}));

vi.mock("./TimeEntryCard", () => ({
  TimeEntryCard: ({ entry }: { entry: { name: string } }) => (
    <div data-testid="entry-card">{entry.name}</div>
  ),
}));

function setupMockData() {
  mockUseWeeklyEntries.mockReturnValue({
    data: {
      week_start: "2026-04-11T00:00:00Z",
      week_end: "2026-04-17T23:59:59Z",
      entries_by_day: {
        "2026-04-11": [
          createTimeEntry({ id: "e1", name: "Task A", duration_ms: 3600000 }),
          createTimeEntry({ id: "e2", name: "Task B", duration_ms: 1800000 }),
        ],
        "2026-04-12": [
          createTimeEntry({ id: "e3", name: "Task C", duration_ms: 7200000 }),
        ],
      },
      daily_totals: {
        "2026-04-11": 5400000,
        "2026-04-12": 7200000,
      },
      weekly_total: 12600000,
    },
    isLoading: false,
    error: null,
  });
}

describe("WeeklyView - Display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockData();
  });

  it("renders weekly total", () => {
    render(<WeeklyView />);
    expect(screen.getByText("3:30:00.000")).toBeInTheDocument();
  });

  it("renders entry cards", () => {
    render(<WeeklyView />);
    const cards = screen.getAllByTestId("entry-card");
    expect(cards).toHaveLength(3);
    expect(screen.getByText("Task A")).toBeInTheDocument();
    expect(screen.getByText("Task B")).toBeInTheDocument();
    expect(screen.getByText("Task C")).toBeInTheDocument();
  });

  it("renders daily totals for each day", () => {
    render(<WeeklyView />);
    expect(screen.getByText("1:30:00.000")).toBeInTheDocument();
    expect(screen.getByText("2:00:00.000")).toBeInTheDocument();
  });

  it("renders day headers with weekday name", () => {
    render(<WeeklyView />);
    expect(screen.getByText("Saturday")).toBeInTheDocument();
    expect(screen.getByText("Sunday")).toBeInTheDocument();
  });
});

describe("WeeklyView - Loading & Empty States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner when isLoading is true", () => {
    mockUseWeeklyEntries.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    render(<WeeklyView />);
    expect(document.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("shows empty state when no entries", () => {
    mockUseWeeklyEntries.mockReturnValue({
      data: {
        entries_by_day: {},
        daily_totals: {},
        weekly_total: 0,
      },
      isLoading: false,
      error: null,
    });
    render(<WeeklyView />);
    expect(screen.getByText("No time entries for this week")).toBeInTheDocument();
  });

  it("shows error alert when query errors", () => {
    mockUseWeeklyEntries.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
    });
    render(<WeeklyView />);
    expect(screen.getByText("Failed to load time entries")).toBeInTheDocument();
  });
});

describe("WeeklyView - Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockData();
  });

  it("calls useWeeklyEntries with a different week on prev click", async () => {
    const user = userEvent.setup();
    render(<WeeklyView />);

    const initialCallArg = mockUseWeeklyEntries.mock.calls[0][0];
    const prevButton = screen.getAllByRole("button")[0];
    await user.click(prevButton);

    const lastCall = mockUseWeeklyEntries.mock.calls.at(-1);
    expect(lastCall?.[0]).not.toBe(initialCallArg);
  });

  it("shows Today button when offset is not 0", async () => {
    const user = userEvent.setup();
    render(<WeeklyView />);

    expect(screen.queryByText("Today")).not.toBeInTheDocument();

    const prevButton = screen.getAllByRole("button")[0];
    await user.click(prevButton);

    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("hides Today button after clicking it", async () => {
    const user = userEvent.setup();
    render(<WeeklyView />);

    const prevButton = screen.getAllByRole("button")[0];
    await user.click(prevButton);

    await user.click(screen.getByText("Today"));
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });
});
