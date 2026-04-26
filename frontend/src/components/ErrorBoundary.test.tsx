import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ throws }: { throws: boolean }) {
  if (throws) throw new Error("Kaboom");
  return <div>OK</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <Boom throws={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("renders fallback when child throws", () => {
    const original = console.error;
    console.error = () => {};
    render(
      <ErrorBoundary>
        <Boom throws={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Kaboom")).toBeInTheDocument();
    console.error = original;
  });

  it("includes a Refresh Page button", () => {
    const original = console.error;
    console.error = () => {};
    render(
      <ErrorBoundary>
        <Boom throws={true} />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole("button", { name: /refresh page/i }),
    ).toBeInTheDocument();
    console.error = original;
  });
});
