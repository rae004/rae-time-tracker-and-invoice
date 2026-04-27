import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastContainer } from "./Toast";
import { ToastProvider, useToast } from "../contexts/ToastContext";

function Trigger({ message, type }: { message: string; type?: "success" | "error" | "warning" | "info" }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast(message, type)}>show</button>;
}

function setup(jsx: React.ReactNode) {
  return render(<ToastProvider>{jsx}<ToastContainer /></ToastProvider>);
}

describe("ToastContainer", () => {
  it("renders nothing when no toasts", () => {
    const { container } = setup(<div />);
    expect(container.querySelector(".toast")).toBeNull();
  });

  it("renders toast with success styling", async () => {
    const user = userEvent.setup();
    setup(<Trigger message="Saved!" type="success" />);

    await user.click(screen.getByText("show"));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Saved!");
    expect(alert.className).toContain("alert-success");
  });

  it("renders toast with error styling", async () => {
    const user = userEvent.setup();
    setup(<Trigger message="Failed" type="error" />);

    await user.click(screen.getByText("show"));
    expect(screen.getByRole("alert").className).toContain("alert-error");
  });

  it("renders toast with warning styling", async () => {
    const user = userEvent.setup();
    setup(<Trigger message="Watch out" type="warning" />);

    await user.click(screen.getByText("show"));
    expect(screen.getByRole("alert").className).toContain("alert-warning");
  });

  it("removes toast on click", async () => {
    const user = userEvent.setup();
    setup(<Trigger message="Click me" type="info" />);

    await user.click(screen.getByText("show"));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("alert"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// Standalone effect of timer-based auto-dismiss is covered in ToastContext.test.tsx
// to avoid mixing fake timers with userEvent.
afterEach(() => {
  // ensure any pending real timers from showToast (4s auto-dismiss) don't leak.
  // They run on real timers but have no observable effect once test unmounts.
  act(() => undefined);
});
