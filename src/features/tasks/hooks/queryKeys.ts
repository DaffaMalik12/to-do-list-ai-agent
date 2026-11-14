import type { TaskListParams } from "@/features/tasks/model/task.types";

export const tasksKeys = {
  all: ["tasks"] as const,
  lists: () => [...tasksKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...tasksKeys.lists(), params] as const,
};
