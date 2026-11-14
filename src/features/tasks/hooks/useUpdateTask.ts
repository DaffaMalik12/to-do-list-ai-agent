"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { updateTask } from "@/features/tasks/api/tasks.client";
import { tasksKeys } from "@/features/tasks/hooks/queryKeys";
import type {
  Task,
  TaskListResult,
  UpdateTaskInput,
} from "@/features/tasks/model/task.types";
import { useToast } from "@/shared/ui/Toast";

export interface UpdateTaskVariables {
  id: string;
  input: UpdateTaskInput;
}

type Snapshot = Array<[readonly unknown[], TaskListResult | undefined]>;

export function useUpdateTask(): UseMutationResult<
  Task,
  Error,
  UpdateTaskVariables,
  { previous: Snapshot }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, input }: UpdateTaskVariables) => updateTask(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.lists() });
      const previous = queryClient.getQueriesData<TaskListResult>({
        queryKey: tasksKeys.lists(),
      });

      const updatedAt = new Date().toISOString();

      queryClient.setQueriesData<TaskListResult>(
        { queryKey: tasksKeys.lists() },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((task) => {
              if (task.id !== id) return task;

              const next: Task = {
                ...task,
                title: input.title ?? task.title,
                description:
                  input.description === undefined
                    ? task.description
                    : input.description,
                priority: input.priority ?? task.priority,
                dueDate:
                  input.dueDate === undefined ? task.dueDate : input.dueDate,
                categoryId:
                  input.categoryId === undefined
                    ? task.categoryId
                    : input.categoryId,
                updatedAt,
              };

              if (typeof input.completed === "boolean") {
                next.completed = input.completed;
                next.completedAt = input.completed ? updatedAt : null;
              }

              return next;
            }),
          };
        },
      );

      return { previous };
    },
    onError: (error, _variables, context) => {
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
