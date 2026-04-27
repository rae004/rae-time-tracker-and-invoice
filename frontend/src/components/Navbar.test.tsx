import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Navbar } from "./Navbar";

const mockToggleTheme = vi.fn();
let mockIsDark = false;

vi.mock("../hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: mockIsDark,
    toggleTheme: mockToggleTheme,
    theme: mockIsDark ? "dark" : "light",
    setTheme: vi.fn(),
    useSystemTheme: vi.fn(),
  }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockToggleTheme.mockReset();
  mockIsDark = false;
});

describe("Navbar", () => {
  it("renders nav links", () => {
    renderAt("/");
    expect(screen.getByText("Time Tracker")).toBeInTheDocument();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("marks the Time Tracker link active on /", () => {
    renderAt("/");
    expect(screen.getByText("Time Tracker").className).toContain("active");
    expect(screen.getByText("Settings").className).not.toContain("active");
  });

  it("marks Invoices active on /invoices/anything (startsWith)", () => {
    renderAt("/invoices/abc");
    expect(screen.getByText("Invoices").className).toContain("active");
  });

  it("calls toggleTheme on theme button click", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.click(
      screen.getByRole("button", { name: /switch to dark mode/i }),
    );
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it("flips aria-label when isDark is true", () => {
    mockIsDark = true;
    renderAt("/");
    expect(
      screen.getByRole("button", { name: /switch to light mode/i }),
    ).toBeInTheDocument();
  });
});
