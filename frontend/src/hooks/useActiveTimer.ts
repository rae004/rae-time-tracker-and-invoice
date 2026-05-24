import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { api } from "../services/api";
import type { ActiveTimerResponse, TimeEntry } from "../types";
import { timeEntryKeys } from "./useTimeEntries";

// Fetch active timer
export function useActiveTimer() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: timeEntryKeys.active(),
    queryFn: () => api.get<ActiveTimerResponse>("/time-entries/active"),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: timeEntryKeys.active() });
  }, [queryClient]);

  return {
    ...query,
    activeEntry: query.data?.active_entry ?? null,
    invalidate,
  };
}

// Hook to track running duration in real-time
export function useRunningDuration(entry: TimeEntry | null) {
  const isRunning = entry?.is_running ?? false;

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!isRunning) return () => {};
      const interval = setInterval(callback, 50);
      return () => clearInterval(interval);
    },
    [isRunning]
  );

  const getSnapshot = useCallback(() => {
    if (!entry) return 0;
    if (!entry.is_running) return entry.duration_ms ?? 0;
    return Date.now() - new Date(entry.start_time).getTime();
  }, [entry]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
