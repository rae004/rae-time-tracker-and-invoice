import { useState, useMemo } from "react";
import { useWeeklyEntries } from "../hooks/useTimeEntries";
import { TimeEntryCard } from "./TimeEntryCard";
import { formatDuration, formatDateWeekday, formatWeekdayName, formatMonth, toDateString } from "../utils/formatters";

// Get Saturday of the current week
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Saturday = 6, so we need to go back (day + 1) % 7 days
  const diff = (day + 1) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = formatMonth(weekStart);
  const startDay = weekStart.getDate();
  const endMonth = formatMonth(weekEnd);
  const endDay = weekEnd.getDate();
  const year = weekEnd.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

export function WeeklyView() {
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = useMemo(() => {
    const start = getWeekStart(new Date());
    start.setDate(start.getDate() + weekOffset * 7);
    return start;
  }, [weekOffset]);

  const weekStartString = toDateString(currentWeekStart);

  const { data, isLoading, error } = useWeeklyEntries(weekStartString);

  const goToPreviousWeek = () => setWeekOffset((prev) => prev - 1);
  const goToNextWeek = () => setWeekOffset((prev) => prev + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  const weeklyTotalMs = data?.weekly_total ?? 0;

  const sortedDays = useMemo(() => {
    if (!data?.entries_by_day) return [];

    return Object.keys(data.entries_by_day)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        entries: data.entries_by_day[date],
        totalMs: data.daily_totals[date] ?? 0,
      }));
  }, [data?.entries_by_day, data?.daily_totals]);

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load time entries</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={goToPreviousWeek}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <h2 className="text-lg font-semibold">
            {formatWeekRange(currentWeekStart)}
          </h2>

          <button
            className="btn btn-ghost btn-sm"
            onClick={goToNextWeek}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {weekOffset !== 0 && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={goToCurrentWeek}
            >
              Today
            </button>
          )}
        </div>

        {/* Weekly total */}
        <div className="text-right">
          <span className="text-sm text-base-content/70">Week Total</span>
          <div className="font-mono text-xl font-bold">
            {formatDuration(weeklyTotalMs)}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Daily entries */}
      {!isLoading && sortedDays.length === 0 && (
        <div className="text-center py-8 text-base-content/50">
          No time entries for this week
        </div>
      )}

      {!isLoading && sortedDays.length > 0 && (
        <div className="space-y-6">
          {sortedDays.map((day) => (
            <div key={day.date} className="space-y-2">
              {/* Day header */}
              <div className="flex items-center justify-between border-b border-base-300 pb-2">
                <div>
                  <span className="font-medium">
                    {formatWeekdayName(day.date)}
                  </span>
                  <span className="text-base-content/50 ml-2">
                    {formatDateWeekday(day.date)}
                  </span>
                </div>
                <div className="font-mono text-sm">
                  {formatDuration(day.totalMs)}
                </div>
              </div>

              {/* Day entries */}
              <div className="space-y-2 pl-2">
                {day.entries.map((entry) => (
                  <TimeEntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
