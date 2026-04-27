import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./components/Layout", () => ({
  Layout: () => <div data-testid="layout">layout</div>,
}));

vi.mock("./pages/TimeTracker", () => ({ TimeTracker: () => null }));
vi.mock("./pages/Settings", () => ({ Settings: () => null }));
vi.mock("./pages/Invoices", () => ({ Invoices: () => null }));
vi.mock("./pages/CreateInvoice", () => ({ CreateInvoice: () => null }));
vi.mock("./pages/InvoiceDetail", () => ({ InvoiceDetail: () => null }));

describe("App", () => {
  it("renders inside BrowserRouter without crashing", () => {
    render(<App />);
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });
});
