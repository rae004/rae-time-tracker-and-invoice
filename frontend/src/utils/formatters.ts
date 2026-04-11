export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "0:00:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Short date with year: "Jan 5, 2026" */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Long date with year: "January 5, 2026" */
export function formatDateLong(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Weekday + short date without year: "Mon, Jan 5" */
export function formatDateWeekday(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Weekday name only: "Monday" */
export function formatWeekdayName(dateString: string): string {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
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

/** Convert ISO datetime to datetime-local input value: "2026-01-05T09:30" */
export function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local input value to ISO string */
export function fromLocalDatetime(local: string): string {
  return new Date(local).toISOString();
}

/** Convert Date to "YYYY-MM-DD" date string */
export function toDateString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
