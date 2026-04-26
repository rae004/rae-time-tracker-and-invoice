import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../contexts/ToastContext";
import type {
  CategoryTag,
  Client,
  Invoice,
  InvoiceLineItem,
  InvoiceWithClient,
  Project,
  TimeEntryWithProject,
  UserProfile,
} from "../types";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function createHookWrapper(client?: QueryClient) {
  const queryClient = client ?? createQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return QueryClientProvider({ client: queryClient, children });
  };
}

export function createCategoryTag(
  overrides?: Partial<CategoryTag>,
): CategoryTag {
  return {
    id: "tag-1",
    name: "Development",
    color: "#22C55E",
    created_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

export function createTimeEntry(
  overrides?: Partial<TimeEntryWithProject>,
): TimeEntryWithProject {
  return {
    id: "entry-1",
    project_id: "project-1",
    name: "Working on feature",
    start_time: "2026-04-11T14:00:00.000Z",
    end_time: "2026-04-11T15:30:00.000Z",
    duration_ms: 5400000,
    is_running: false,
    created_at: "2026-04-11T14:00:00.000Z",
    updated_at: "2026-04-11T15:30:00.000Z",
    tags: [],
    project_name: "My Project",
    client_name: "Acme Corp",
    ...overrides,
  };
}

export function createProject(overrides?: Partial<Project>): Project {
  return {
    id: "project-1",
    client_id: "client-1",
    name: "My Project",
    description: "A test project",
    is_active: true,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

export function createClient(overrides?: Partial<Client>): Client {
  return {
    id: "client-1",
    name: "Acme Corp",
    address_line1: "123 Main St",
    address_line2: null,
    city: "Anytown",
    state: "CA",
    zip_code: "12345",
    phone: null,
    hourly_rate: "150.00",
    service_description: "Software development services",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

export function createInvoiceLineItem(
  overrides?: Partial<InvoiceLineItem>,
): InvoiceLineItem {
  return {
    id: "li-1",
    invoice_id: "inv-1",
    time_entry_id: "entry-1",
    project_name: "My Project",
    time_entry_name: "Working on feature",
    work_date: "2026-04-15",
    hours: "1.5000",
    amount: "225.00",
    sort_order: 0,
    ...overrides,
  };
}

export function createInvoice(overrides?: Partial<Invoice>): Invoice {
  return {
    id: "inv-1",
    invoice_number: 1001,
    client_id: "client-1",
    period_start: "2026-04-01",
    period_end: "2026-04-27",
    hourly_rate: "150.00",
    subtotal: "225.00",
    tax_rate: "0.0000",
    other_charges: "0.00",
    total: "225.00",
    status: "draft",
    pdf_path: null,
    created_at: "2026-04-15T12:00:00Z",
    line_items: [createInvoiceLineItem()],
    ...overrides,
  };
}

export function createInvoiceWithClient(
  overrides?: Partial<InvoiceWithClient>,
): InvoiceWithClient {
  return {
    ...createInvoice(),
    client_name: "Acme Corp",
    ...overrides,
  };
}

export function createUserProfile(
  overrides?: Partial<UserProfile>,
): UserProfile {
  return {
    id: "profile-1",
    name: "John Doe",
    address_line1: "456 Other St",
    address_line2: null,
    city: "Othertown",
    state: "NY",
    zip_code: "54321",
    email: "john@example.com",
    phone: "555-0100",
    payment_instructions: "Direct deposit preferred",
    next_invoice_number: 1002,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return QueryClientProvider(
      { client: queryClient, children: ToastProvider({ children }) },
    );
  };
}
