import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { User } from "./types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (full_name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.get<User>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  const loginM = useMutation({
    mutationFn: (v: { email: string; password: string }) => api.post<User>("/auth/login", v),
    onSuccess: (u) => qc.setQueryData(["me"], u),
  });
  const signupM = useMutation({
    mutationFn: (v: { full_name: string; email: string; password: string }) => api.post<User>("/auth/signup", v),
    onSuccess: (u) => qc.setQueryData(["me"], u),
  });
  const logoutM = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(["me"], null);
    },
  });

  const value: AuthValue = {
    user: me.data ?? null,
    loading: me.isLoading,
    login: async (email, password) => void (await loginM.mutateAsync({ email, password })),
    signup: async (full_name, email, password) => void (await signupM.mutateAsync({ full_name, email, password })),
    logout: async () => void (await logoutM.mutateAsync()),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
