// API Error
export interface ApiError {
  error: string | object[];
}

// Client
export interface Client {
  id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
  hourly_rate: string;
  service_description: string;
  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  zip_code: string;
  phone?: string | null;
  hourly_rate?: string;
  service_description?: string;
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
}

// Project
export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithClient extends Project {
  client_name: string | null;
}

export interface ProjectCreate {
  client_id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

// Category Tag
export interface CategoryTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CategoryTagCreate {
  name: string;
  color?: string;
}

export interface CategoryTagListResponse {
  tags: CategoryTag[];
  total: number;
}

// Time Entry
export interface TimeEntry {
  id: string;
  project_id: string;
  name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  is_running: boolean;
  created_at: string;
  updated_at: string;
  tags: CategoryTag[];
}

export interface TimeEntryWithProject extends TimeEntry {
  project_name: string | null;
  client_name: string | null;
}

export interface TimeEntryCreate {
  project_id: string;
  name: string;
  start_time?: string | null;
  end_time?: string | null;
  tag_ids?: string[];
}

export interface TimeEntryUpdate {
  name?: string;
  project_id?: string;
  start_time?: string;
  end_time?: string;
  tag_ids?: string[];
}

export interface TimeEntryListResponse {
  entries: TimeEntry[];
  total: number;
}

export interface ActiveTimerResponse {
  active_entry: TimeEntry | null;
}

export interface WeeklyEntriesResponse {
  week_start: string;
  week_end: string;
  entries_by_day: Record<string, TimeEntryWithProject[]>;
  daily_totals: Record<string, number>;
  weekly_total: number;
}

// User Profile
export interface UserProfile {
  id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  email: string;
  phone: string;
  payment_instructions: string;
  next_invoice_number: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  name?: string;
  address_line1?: string;
  address_line2?: string | null;
  city?: string;
  state?: string;
  zip_code?: string;
  email?: string;
  phone?: string;
  payment_instructions?: string;
}

// Helper functions
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "0:00:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(2)} hrs`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
