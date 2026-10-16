import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "./api";
import type { ChatMessage, ChatReply, Dependent, Goal, KeyDate, Profile, Task, Workflow, WorkflowSummary } from "./types";

export const useProfile = () =>
  useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      try {
        return await api.get<Profile>("/profile");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

export const useKeyDates = () => useQuery({ queryKey: ["key-dates"], queryFn: () => api.get<KeyDate[]>("/key-dates") });
export const useGoals = () => useQuery({ queryKey: ["goals"], queryFn: () => api.get<Goal[]>("/goals") });
export const useTasks = () => useQuery({ queryKey: ["tasks"], queryFn: () => api.get<Task[]>("/tasks") });
export const useDependents = () => useQuery({ queryKey: ["dependents"], queryFn: () => api.get<Dependent[]>("/dependents") });
export const useWorkflows = () => useQuery({ queryKey: ["workflows"], queryFn: () => api.get<WorkflowSummary[]>("/workflows") });
export const useWorkflow = (id: string | null) =>
  useQuery({ queryKey: ["workflow", id], queryFn: () => api.get<Workflow>(`/workflows/${id}`), enabled: !!id });

const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong.");

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Profile) => api.put<Profile>("/profile", p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["key-dates"] });
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Profile saved");
    },
    onError,
  });
}

export function useAddDependent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Omit<Dependent, "id">) => api.post<Dependent>("/dependents", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dependents"] });
      qc.invalidateQueries({ queryKey: ["key-dates"] });
    },
    onError,
  });
}

export function useDeleteDependent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/dependents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dependents"] });
      qc.invalidateQueries({ queryKey: ["key-dates"] });
    },
    onError,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { workflow_id: string; start_date?: string }) => api.post<Goal>("/goals", v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError,
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/goals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError,
  });
}

export function useAddTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { title: string; due_date?: string | null }) => api.post<Task>("/tasks", v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError,
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError,
  });
}

/** Updates a task with an optimistic cache change so ticking feels instant. */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; done?: boolean; notes?: string; due_date?: string | null }) =>
      api.patch<Task>(`/tasks/${id}`, patch),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], (old) => old?.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      onError(e);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export const useChatStatus = () => useQuery({ queryKey: ["chat-status"], queryFn: () => api.get<{ enabled: boolean }>("/chat/status") });
export const useChatHistory = () => useQuery({ queryKey: ["chat-history"], queryFn: () => api.get<ChatMessage[]>("/chat/messages"), staleTime: Infinity });
export const sendChat = (message: string) => api.post<ChatReply>("/chat", { message });
export const clearChat = () => api.del("/chat");
