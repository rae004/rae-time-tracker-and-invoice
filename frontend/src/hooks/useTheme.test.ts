import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./useTheme";

type MediaQueryHandler = (e: MediaQueryListEvent) => void;

let matchesDark = false;
let registeredHandler: MediaQueryHandler | null = null;

function installMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      get matches() {
        return matchesDark;
      },
      addEventListener: (_event: string, handler: MediaQueryHandler) => {
        registeredHandler = handler;
      },
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  matchesDark = false;
  registeredHandler = null;
  installMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTheme - initialization", () => {
  it("reads from data-theme attribute first", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(result.current.isDark).toBe(true);
  });

  it("falls back to localStorage when data-theme attr missing", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("falls back to system preference (dark) when nothing stored", () => {
    matchesDark = true;
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("falls back to system preference (light) when nothing stored", () => {
    matchesDark = false;
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("ignores invalid data-theme attribute values", () => {
    document.documentElement.setAttribute("data-theme", "neon");
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });
});

describe("useTheme - setTheme", () => {
  it("updates state, DOM, and localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});

describe("useTheme - toggleTheme", () => {
  it("flips light → dark", () => {
    document.documentElement.setAttribute("data-theme", "light");
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("flips dark → light", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });
});

describe("useTheme - useSystemTheme", () => {
  it("clears localStorage and applies system preference", () => {
    localStorage.setItem("theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");
    matchesDark = false;

    const { result } = renderHook(() => useTheme());
    act(() => result.current.useSystemTheme());

    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

describe("useTheme - system theme listener", () => {
  it("auto-switches when no stored preference", () => {
    const { result } = renderHook(() => useTheme());
    expect(registeredHandler).not.toBeNull();

    act(() => {
      registeredHandler?.({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current.theme).toBe("dark");
  });

  it("does NOT auto-switch when user has a stored preference", () => {
    localStorage.setItem("theme", "light");
    const { result } = renderHook(() => useTheme());
    const initialTheme = result.current.theme;

    act(() => {
      registeredHandler?.({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current.theme).toBe(initialTheme);
  });
});
