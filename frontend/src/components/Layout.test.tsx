import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";

vi.mock("./Navbar", () => ({
  Navbar: () => <nav data-testid="navbar">navbar</nav>,
}));

vi.mock("./Toast", () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
}));

describe("Layout", () => {
  it("renders Navbar, Outlet content, and ToastContainer", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>page-content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByText("page-content")).toBeInTheDocument();
    expect(screen.getByTestId("toast-container")).toBeInTheDocument();
  });
});
