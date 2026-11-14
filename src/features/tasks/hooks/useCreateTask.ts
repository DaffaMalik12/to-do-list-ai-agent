"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { createTask } from "@/features/tasks/api/tasks.client";
import { tasksKeys } from "@/features/tasks/hooks/queryKeys";
import type {
  CreateTaskInput,
  Task,
  TaskListResult,
} from "@/features/tasks/model/task.types";
import { useToast } from "@/shared/ui/Toast";

type Snapshot = Array<[readonly unknown[], TaskListResult | undefined]>;

/**
 * `position` optimistis = `-Date.now()`.
 *
 * PENTING: nilai ini HANYA dipakai untuk mengurutkan item di cache client
 * selagi menunggu server merespons. Server TIDAK PERNAH menerima / menyimpan
 * nilai negatif — `POST /api/tasks` tidak menerima field `position`; server
 * menetapkannya sendiri via `max(position) + POSITION_STEP` (lihat
 * `src/features/tasks/server/tasks.service.ts`). `invalidateQueries` di
 * `onSettled` akan menimpa item optimistis dengan data asli dari server,
 * sehingga nilai negatif tidak pernah bocor ke state persisten.
 */
export function useCreateTask(): UseMutationResult<
  Task,
  Error,
  CreateTaskInput,
  { previous: Snapshot }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.lists() });
      const previous = queryClient.getQueriesData<TaskListResult>({
        queryKey: tasksKeys.lists(),
      });

      const now = new Date().toISOString();
      const optimistic: Task = {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: input.title,
        description: input.description ?? null,
        completed: false,
        priority: input.priority ?? "medium",
        dueDate: input.dueDate ?? null,
        categoryId: input.categoryId ?? null,
        // Hanya untuk pengurutan lokal di cache — bukan nilai domain.
        // Server menetapkan position sendiri (max + POSITION_STEP).
        position: -Date.now(),
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        subtaskSummary: { total: 0, done: 0 },
        checklistSummary: { total: 0, done: 0 },
      };

      // Sisipkan di depan array agar tampil paling atas apa pun sort server.
      queryClient.setQueriesData<TaskListResult>(
        { queryKey: tasksKeys.lists() },
        (current) => {
          if (!current) return current;
          return { ...current, items: [optimistic, ...current.items] };
        },
      );

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        for (const [key, value] of context.previous) {
          queryClient.setQueryData(key, value);
        }
      }
      toast(error.message, "error");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
    },
  });
}
