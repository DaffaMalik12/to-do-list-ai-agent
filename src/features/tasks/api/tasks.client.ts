import {
  taskListResponseSchema,
  taskResponseSchema,
} from "@/features/tasks/model/task.schema";
import type {
  CreateTaskInput,
  Task,
  TaskListParams,
  TaskListResult,
  UpdateTaskInput,
} from "@/features/tasks/model/task.types";
import { ApiError, apiFetch } from "@/services/http";

export { ApiError };

function buildQuery(params: TaskListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function fetchTasks(
  params: TaskListParams = {},
  signal?: AbortSignal,
): Promise<TaskListResult> {
  const response = await apiFetch(`/api/tasks${buildQuery(params)}`, {
    method: "GET",
    signal,
  });

  if (response.status === 204) {
    return { items: [], nextCursor: null };
  }

  const payload: unknown = await response.json();
  const parsed = taskListResponseSchema.parse(payload);
  return parsed.data as TaskListResult;
}

export async function createTask(
  input: CreateTaskInput,
  signal?: AbortSignal,
): Promise<Task> {
  const response = await apiFetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify(input),
    signal,
  });
  const payload: unknown = await response.json();
  return taskResponseSchema.parse(payload).data as Task;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  signal?: AbortSignal,
): Promise<Task> {
  const response = await apiFetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    signal,
  });
  const payload: unknown = await response.json();
  return taskResponseSchema.parse(payload).data as Task;
}

export async function deleteTask(
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiFetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal,
  });
}

export const tasksClient = {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
};
