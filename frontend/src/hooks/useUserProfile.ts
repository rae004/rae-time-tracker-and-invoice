import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { UserProfile, UserProfileUpdate } from "../types";

export const userProfileKeys = {
  all: ["userProfile"] as const,
};

export function useUserProfile() {
  return useQuery({
    queryKey: userProfileKeys.all,
    queryFn: () => api.get<UserProfile>("/user-profile"),
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserProfileUpdate) =>
      api.put<UserProfile>("/user-profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
    },
  });
}
