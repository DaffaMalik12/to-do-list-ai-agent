"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { deleteTask } from "@/features/tasks/api/tasks.client";
import { tasksKeys } from "@/features/tasks/hooks/queryKeys";
import type { TaskListResult } from "@/features/tasks/model/task.types";
import { useToast } from "@/shared/ui/Toast";

type Snapshot = Array<[readonly unknown[], TaskListResult | undefined]>;

export function useDeleteTask(): UseMutationResult<
  void,
  Error,
  string,
  { previous: Snapshot }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.lists() });
      const previous = queryClient.getQueriesData<TaskListResult>({
        queryKey: tasksKeys.lists(),
      });

      queryClient.setQueriesData<TaskListResult>(
        { queryKey: tasksKeys.lists() },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.filter((task) => task.id !== id),
          };
        },
      );

      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        for (const [key, value] of context.previous) {
          queryClient.setQueryData(key, value);
        }
      }
      toast(error.message, "error");
    },
    onSuccess: () => {
      toast("Tugas dihapus.", "success");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
    },
  });
}
