import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";
import { createTimeEntry } from "../test/fixtures";

const useActiveTimerMock = vi.fn();

vi.mock("./Navbar", () => ({
  Navbar: () => <nav data-testid="navbar">navbar</nav>,
}));

vi.mock("./Toast", () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
}));

vi.mock("../hooks/useActiveTimer", () => ({
  useActiveTimer: () => useActiveTimerMock(),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div>page-content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  beforeEach(() => {
    useActiveTimerMock.mockReturnValue({ activeEntry: null });
    document.title = "Rae Time Tracker";
  });

  it("renders Navbar, Outlet content, and ToastContainer", () => {
    renderLayout();
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByText("page-content")).toBeInTheDocument();
    expect(screen.getByTestId("toast-container")).toBeInTheDocument();
  });

  it("leaves the document title untouched when no timer is running", () => {
    renderLayout();
    expect(document.title).toBe("Rae Time Tracker");
  });

  it("formats the document title as m:ss when a timer has been running under an hour", () => {
    vi.useFakeTimers();
    const start = new Date("2026-01-01T12:00:00Z");
    vi.setSystemTime(new Date(start.getTime() + 12 * 60_000 + 34_000));
    useActiveTimerMock.mockReturnValue({
      activeEntry: createTimeEntry({
        start_time: start.toISOString(),
        is_running: true,
      }),
    });

    renderLayout();
    expect(document.title).toBe("12:34 · Rae Time Tracker");
    vi.useRealTimers();
  });

  it("formats the document title as h:mm:ss past an hour", () => {
    vi.useFakeTimers();
    const start = new Date("2026-01-01T12:00:00Z");
    vi.setSystemTime(
      new Date(start.getTime() + 3600_000 + 23 * 60_000 + 45_000),
    );
    useActiveTimerMock.mockReturnValue({
      activeEntry: createTimeEntry({
        start_time: start.toISOString(),
        is_running: true,
      }),
    });

    renderLayout();
    expect(document.title).toBe("1:23:45 · Rae Time Tracker");
    vi.useRealTimers();
  });

  it("updates the title on each tick while the timer is running", () => {
    vi.useFakeTimers();
    const start = new Date("2026-01-01T12:00:00Z");
    vi.setSystemTime(start);
    useActiveTimerMock.mockReturnValue({
      activeEntry: createTimeEntry({
        start_time: start.toISOString(),
        is_running: true,
      }),
    });

    renderLayout();
    expect(document.title).toBe("0:00 · Rae Time Tracker");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(document.title).toBe("0:01 · Rae Time Tracker");
    vi.useRealTimers();
  });

  it("restores the base title when the timer stops", () => {
    const start = new Date(Date.now() - 5000).toISOString();
    useActiveTimerMock.mockReturnValue({
      activeEntry: createTimeEntry({ start_time: start, is_running: true }),
    });
    const { rerender } = renderLayout();
    expect(document.title).not.toBe("Rae Time Tracker");

    useActiveTimerMock.mockReturnValue({ activeEntry: null });
    rerender(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>page-content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(document.title).toBe("Rae Time Tracker");
  });
});
