"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchTasks } from "@/features/tasks/api/tasks.client";
import { tasksKeys } from "@/features/tasks/hooks/queryKeys";
import type {
  TaskListParams,
  TaskListResult,
} from "@/features/tasks/model/task.types";

export function useTasks(
  params: TaskListParams = {},
): UseQueryResult<TaskListResult, Error> {
  return useQuery({
    queryKey: tasksKeys.list(params),
    queryFn: ({ signal }) => fetchTasks(params, signal),
  });
}
