import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type {
  TimeEntry,
  TimeEntryCreate,
  TimeEntryUpdate,
  TimeEntryListResponse,
  TimeEntryWithProject,
  WeeklyEntriesResponse,
} from "../types";

// Query keys
export const timeEntryKeys = {
  all: ["timeEntries"] as const,
  lists: () => [...timeEntryKeys.all, "list"] as const,
  list: (filters: Record<string, string | boolean | undefined>) =>
    [...timeEntryKeys.lists(), filters] as const,
  details: () => [...timeEntryKeys.all, "detail"] as const,
  detail: (id: string) => [...timeEntryKeys.details(), id] as const,
  active: () => [...timeEntryKeys.all, "active"] as const,
  weekly: (weekStart?: string) =>
    [...timeEntryKeys.all, "weekly", weekStart] as const,
};

// Fetch time entries with filters
export function useTimeEntries(filters?: {
  project_id?: string;
  start_date?: string;
  end_date?: string;
  running?: boolean;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.project_id) queryParams.set("project_id", filters.project_id);
  if (filters?.start_date) queryParams.set("start_date", filters.start_date);
  if (filters?.end_date) queryParams.set("end_date", filters.end_date);
  if (filters?.running !== undefined)
    queryParams.set("running", String(filters.running));

  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `/time-entries?${queryString}`
    : "/time-entries";

  return useQuery({
    queryKey: timeEntryKeys.list(filters || {}),
    queryFn: () => api.get<TimeEntryListResponse>(endpoint),
  });
}

// Fetch a single time entry
export function useTimeEntry(id: string) {
  return useQuery({
    queryKey: timeEntryKeys.detail(id),
    queryFn: () => api.get<TimeEntryWithProject>(`/time-entries/${id}`),
    enabled: !!id,
  });
}

// Fetch weekly entries
export function useWeeklyEntries(weekStart?: string) {
  const endpoint = weekStart
    ? `/time-entries/weekly?week_start=${weekStart}`
    : "/time-entries/weekly";

  return useQuery({
    queryKey: timeEntryKeys.weekly(weekStart),
    queryFn: () => api.get<WeeklyEntriesResponse>(endpoint),
  });
}

// Create time entry mutation
export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TimeEntryCreate) =>
      api.post<TimeEntry>("/time-entries", data),
    onSuccess: () => {
      // Invalidate all time entry queries
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all });
    },
  });
}

// Update time entry mutation
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TimeEntryUpdate }) =>
      api.put<TimeEntryWithProject>(`/time-entries/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all });
      queryClient.invalidateQueries({
        queryKey: timeEntryKeys.detail(variables.id),
      });
    },
  });
}

// Delete time entry mutation
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/time-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all });
    },
  });
}

// Stop timer mutation
export function useStopTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<TimeEntryWithProject>(`/time-entries/${id}/stop`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all });
    },
  });
}
