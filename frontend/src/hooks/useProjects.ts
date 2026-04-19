import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { Project, ProjectCreate, ProjectListResponse } from "../types";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: Record<string, string | boolean | undefined>) =>
    [...projectKeys.lists(), filters] as const,
  detail: (id: string) => [...projectKeys.all, "detail", id] as const,
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

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectCreate) => api.post<Project>("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectCreate> }) =>
      api.put<Project>(`/projects/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
