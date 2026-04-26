import { render, renderHook, act, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastContext";

function ToastViewer() {
  const { toasts } = useToast();
  return (
    <ul>
      {toasts.map((t) => (
        <li key={t.id}>{`${t.type}:${t.message}`}</li>
      ))}
    </ul>
  );
}

describe("useToast", () => {
  it("throws when used outside provider", () => {
    const original = console.error;
    console.error = () => {};
    expect(() => renderHook(() => useToast())).toThrow(
      /must be used within a ToastProvider/,
    );
    console.error = original;
  });

  it("returns toasts/showToast/removeToast inside provider", () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });
    expect(result.current.toasts).toEqual([]);
    expect(typeof result.current.showToast).toBe("function");
    expect(typeof result.current.removeToast).toBe("function");
  });
});

describe("ToastProvider behavior", () => {
  it("appends a toast on showToast", () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });
    act(() => result.current.showToast("Hi", "info"));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Hi");
    expect(result.current.toasts[0].type).toBe("info");
  });

  it("defaults type to info when not provided", () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });
    act(() => result.current.showToast("Default"));
    expect(result.current.toasts[0].type).toBe("info");
  });

  it("auto-dismisses after 4 seconds", () => {
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <ToastViewer />
        </ToastProvider>,
      );
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
      });

      act(() => result.current.showToast("Bye", "info"));
      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(result.current.toasts).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("removeToast removes by id", () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });
    act(() => result.current.showToast("A", "info"));
    expect(result.current.toasts).toHaveLength(1);

    const id = result.current.toasts[0].id;
    act(() => result.current.removeToast(id));
    expect(result.current.toasts).toHaveLength(0);
  });

  it("renders multiple toasts in order", () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });
    act(() => {
      result.current.showToast("First", "success");
      result.current.showToast("Second", "error");
    });
    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0].message).toBe("First");
    expect(result.current.toasts[1].message).toBe("Second");

    render(
      <ToastProvider>
        <ToastViewer />
      </ToastProvider>,
    );
    // second render uses a fresh provider — sanity-only
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
