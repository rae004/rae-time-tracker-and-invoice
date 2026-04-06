import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { CategoryTag, CategoryTagCreate, CategoryTagListResponse } from "../types";

export const categoryTagKeys = {
  all: ["categoryTags"] as const,
  lists: () => [...categoryTagKeys.all, "list"] as const,
};

export function useCategoryTags() {
  return useQuery({
    queryKey: categoryTagKeys.lists(),
    queryFn: () => api.get<CategoryTagListResponse>("/category-tags"),
  });
}

export function useCreateCategoryTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryTagCreate) =>
      api.post<CategoryTag>("/category-tags", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryTagKeys.all });
    },
  });
}

export function useUpdateCategoryTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryTagCreate> }) =>
      api.put<CategoryTag>(`/category-tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryTagKeys.all });
    },
  });
}

export function useDeleteCategoryTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/category-tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryTagKeys.all });
    },
  });
}
