export type TaskStatus = "active" | "completed";

export type TaskPriority = "low" | "medium" | "high";

export type TaskSortField = "created" | "due" | "priority" | "manual";

export type TaskSortOrder = "asc" | "desc";

export type TaskStatusFilter = "all" | TaskStatus;

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResult {
  items: Task[];
  nextCursor: string | null;
}

/**
 * Query string yang mengikuti kontrak backend VO-6.
 * Nilai opsional boleh `undefined`/`null`/"" dan akan dibuang dari query string.
 */
export interface TaskListQuery {
  q?: string | null;
  status?: TaskStatusFilter | null;
  sort?: TaskSortField | null;
  order?: TaskSortOrder | null;
  limit?: number | null;
  cursor?: string | null;
}
