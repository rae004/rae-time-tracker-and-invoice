import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
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
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (!entry || !entry.is_running) {
      setDuration(entry?.duration_seconds ?? 0);
      return;
    }

    // Calculate initial duration
    const startTime = new Date(entry.start_time).getTime();
    const calculateDuration = () => {
      const now = Date.now();
      return Math.floor((now - startTime) / 1000);
    };

    setDuration(calculateDuration());

    // Update every second
    const interval = setInterval(() => {
      setDuration(calculateDuration());
    }, 1000);

    return () => clearInterval(interval);
  }, [entry]);

  return duration;
}
