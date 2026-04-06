import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { CategoryTagListResponse } from "../types";

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
