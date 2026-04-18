export function formatDuration(ms: number | null): string {
  if (ms === null || ms === 0) return "0:00:00.000";

  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}

/** Parse a date string safely, appending T00:00:00 to date-only strings
 *  to prevent UTC midnight from rolling back a day in local time. */
function parseDate(dateString: string): Date {
  if (!dateString.includes("T")) {
    return new Date(dateString + "T00:00:00");
  }
  return new Date(dateString);
}

/** Short date with year: "Jan 5, 2026" */
export function formatDate(dateString: string): string {
  return parseDate(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Long date with year: "January 5, 2026" */
export function formatDateLong(dateString: string): string {
  return parseDate(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Weekday + short date without year: "Sat, Apr 11" */
export function formatDateWeekday(dateString: string): string {
  return parseDate(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Weekday name only: "Saturday" */
export function formatWeekdayName(dateString: string): string {
  return parseDate(dateString).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

/** Short month name: "Jan" */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" });
}

/** Time of day: "9:30 AM" */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Currency: "$1,234.56" — accepts string or number */
export function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Convert ISO datetime to datetime-local input value with seconds: "2026-01-05T09:30:45" */
export function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Extract milliseconds from an ISO datetime string */
export function toLocalMs(iso: string): number {
  return new Date(iso).getMilliseconds();
}

/** Convert datetime-local input value + milliseconds to ISO string */
export function fromLocalDatetime(local: string, ms: number = 0): string {
  const d = new Date(local);
  d.setMilliseconds(ms);
  return d.toISOString();
}

/** Convert Date to "YYYY-MM-DD" date string */
export function toDateString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
