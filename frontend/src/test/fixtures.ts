import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../contexts/ToastContext";
import type { CategoryTag, Project, TimeEntryWithProject } from "../types";

export function createCategoryTag(
  overrides?: Partial<CategoryTag>,
): CategoryTag {
  return {
    id: "tag-1",
    name: "Development",
    color: "#22C55E",
    created_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

export function createTimeEntry(
  overrides?: Partial<TimeEntryWithProject>,
): TimeEntryWithProject {
  return {
    id: "entry-1",
    project_id: "project-1",
    name: "Working on feature",
    start_time: "2026-04-11T14:00:00.000Z",
    end_time: "2026-04-11T15:30:00.000Z",
    duration_ms: 5400000,
    is_running: false,
    created_at: "2026-04-11T14:00:00.000Z",
    updated_at: "2026-04-11T15:30:00.000Z",
    tags: [],
    project_name: "My Project",
    client_name: "Acme Corp",
    ...overrides,
  };
}

export function createProject(overrides?: Partial<Project>): Project {
  return {
    id: "project-1",
    client_id: "client-1",
    name: "My Project",
    description: "A test project",
    is_active: true,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return QueryClientProvider(
      { client: queryClient, children: ToastProvider({ children }) },
    );
  };
}
