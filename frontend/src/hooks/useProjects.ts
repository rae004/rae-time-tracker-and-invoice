import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { ProjectListResponse } from "../types";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: Record<string, string | boolean | undefined>) =>
    [...projectKeys.lists(), filters] as const,
};

export function useProjects(filters?: {
  client_id?: string;
  active?: boolean;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.client_id) queryParams.set("client_id", filters.client_id);
  if (filters?.active !== undefined)
    queryParams.set("active", String(filters.active));

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/projects?${queryString}` : "/projects";

  return useQuery({
    queryKey: projectKeys.list(filters || {}),
    queryFn: () => api.get<ProjectListResponse>(endpoint),
  });
}

export function useActiveProjects() {
  return useProjects({ active: true });
}
