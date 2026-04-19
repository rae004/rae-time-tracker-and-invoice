import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type {
  Invoice,
  InvoiceCreate,
  InvoiceListResponse,
  InvoicePreview,
  InvoicePreviewRequest,
  InvoiceUpdate,
} from "../types";

const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (filters: { client_id?: string; status?: string }) =>
    [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  preview: () => [...invoiceKeys.all, "preview"] as const,
};

export function useInvoices(filters?: { client_id?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.client_id) params.append("client_id", filters.client_id);
  if (filters?.status) params.append("status", filters.status);
  const queryString = params.toString();

  return useQuery({
    queryKey: invoiceKeys.list(filters || {}),
    queryFn: () =>
      api.get<InvoiceListResponse>(
        `/invoices${queryString ? `?${queryString}` : ""}`
      ),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => api.get<Invoice>(`/invoices/${id}`),
    enabled: !!id,
  });
}

export function useInvoicePreview() {
  return useMutation({
    mutationFn: (data: InvoicePreviewRequest) =>
      api.post<InvoicePreview>("/invoices/preview", data),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvoiceCreate) => api.post<Invoice>("/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceUpdate }) =>
      api.put<Invoice>(`/invoices/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useFinalizeInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Invoice>(`/invoices/${id}/finalize`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
}

export function getInvoicePdfUrl(invoiceId: string): string {
  return `/api/invoices/${invoiceId}/pdf`;
}
