export type TaskStatus = "active" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type TaskSort = "created" | "due" | "priority" | "manual";
export type TaskOrder = "asc" | "desc";
export type TaskStatusFilter = TaskStatus | "all";
export type TaskDueFilter = "today" | "overdue";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: string | null;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResult {
  items: Task[];
  nextCursor: string | null;
}

/**
 * Hasil normalisasi & validasi query `GET /api/tasks`.
 * `q` yang sudah dinormalisasi TIDAK boleh mengandung wildcard-only
 * (kasus tersebut diperlakukan sebagai "tanpa filter").
 */
export interface TaskListQuery {
  q?: string;
  status: TaskStatusFilter;
  categoryId?: string;
  due?: TaskDueFilter;
  sort: TaskSort;
  order: TaskOrder;
  limit: number;
  offset: number;
}

export interface CreateTaskInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: string | null;
  dueDate: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  categoryId?: string | null;
  dueDate?: string | null;
}
