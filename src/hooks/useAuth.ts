/**
 * TanStack Query hooks for Authentication and Session state.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/lib/api/services";
import { tokenStorage } from "@/lib/api/client";
import type { LoginRequest, UserRegisterRequest, UserResponse } from "@/lib/api/types";
import { toast } from "sonner";

export const AUTH_KEYS = {
  me: ["auth", "me"] as const,
};

export function useCurrentUser() {
  return useQuery<UserResponse | null>({
    queryKey: AUTH_KEYS.me,
    queryFn: async () => {
      const token = tokenStorage.getAccessToken();
      if (!token) return null;
      try {
        return await authService.getMe();
      } catch {
        tokenStorage.clearTokens();
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
      toast.success("Successfully logged in!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to log in.");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UserRegisterRequest) => authService.register(userData),
    onSuccess: () => {
      toast.success("Account registered successfully! You can now log in.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Registration failed.");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    authService.logout();
    queryClient.setQueryData(AUTH_KEYS.me, null);
    toast.info("Logged out.");
  };
}
