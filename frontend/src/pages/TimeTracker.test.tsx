import { render, screen } from "@testing-library/react";
import { TimeTracker } from "./TimeTracker";

vi.mock("../components/TimerControls", () => ({
  TimerControls: () => <div data-testid="timer-controls" />,
}));

vi.mock("../components/WeeklyView", () => ({
  WeeklyView: () => <div data-testid="weekly-view" />,
}));

describe("TimeTracker", () => {
  it("renders heading and child components", () => {
    render(<TimeTracker />);
    expect(
      screen.getByRole("heading", { name: "Time Tracker" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("timer-controls")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-view")).toBeInTheDocument();
  });
});
