import { render, screen } from "@testing-library/react";
import { Home } from "./Home";

describe("Home", () => {
  it("renders welcome heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /welcome to rae time tracker/i }),
    ).toBeInTheDocument();
  });

  it("renders Getting Started section", () => {
    render(<Home />);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
  });

  it("renders Tech Stack section with backend and frontend lists", () => {
    render(<Home />);
    expect(screen.getByText("Tech Stack")).toBeInTheDocument();
    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });
});
