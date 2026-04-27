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
  project_id: string | null;
  name: string;
  start_time: string;
  end_time: string | null;
  duration_ms: number | null;
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
  project_id?: string | null;
  name?: string;
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

// Invoice
export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  time_entry_id: string | null;
  project_name: string;
  time_entry_name: string | null;
  work_date: string;
  hours: string;
  amount: string;
  sort_order: number;
}

export interface InvoiceLineItemCreate {
  time_entry_id?: string | null;
  project_name: string;
  time_entry_name?: string | null;
  work_date: string;
  hours: string;
  amount: string;
  sort_order?: number;
}

export interface Invoice {
  id: string;
  invoice_number: number;
  client_id: string;
  period_start: string;
  period_end: string;
  hourly_rate: string;
  subtotal: string;
  tax_rate: string;
  other_charges: string;
  total: string;
  status: "draft" | "finalized";
  pdf_path: string | null;
  created_at: string;
  line_items: InvoiceLineItem[];
}

export interface InvoiceWithClient extends Invoice {
  client_name: string | null;
}

export interface InvoiceCreate {
  client_id: string;
  period_start: string;
  period_end: string;
  hourly_rate: string;
  tax_rate?: string;
  other_charges?: string;
  line_items?: InvoiceLineItemCreate[];
}

export interface InvoiceUpdate {
  period_start?: string;
  period_end?: string;
  hourly_rate?: string;
  tax_rate?: string;
  other_charges?: string;
  line_items?: InvoiceLineItemCreate[];
}

export interface InvoiceListResponse {
  invoices: InvoiceWithClient[];
  total: number;
}

export interface InvoicePreviewRequest {
  client_id: string;
  period_start: string;
  period_end: string;
  exclude_entry_ids?: string[];
}

export interface InvoicePreview {
  client_id: string;
  client_name: string;
  period_start: string;
  period_end: string;
  hourly_rate: string;
  line_items: InvoiceLineItemCreate[];
  subtotal: string;
  tax_rate: string;
  other_charges: string;
  total: string;
}
