import type { TaskPriority } from "@/features/tasks/model/task.schema";

export type { TaskPriority };

/** Ringkasan subtask/checklist yang selalu disertakan pada tiap tugas. */
export interface TaskSummary {
  total: number;
  done: number;
}

/** Bentuk tugas yang dikirim ke client. */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: TaskPriority;
  dueDate: string | null;
  categoryId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  subtaskSummary: TaskSummary;
  checklistSummary: TaskSummary;
}

export type TaskListStatus = "all" | "active" | "completed";
export type TaskListDue = "today" | "overdue";
/**
 * `created` = urut `created_at`, `manual` = urut `position` (drag-and-drop nanti).
 * Tiket VO-2 memisahkan keduanya agar kontrak sort tidak ambigu.
 */
export type TaskListSort = "created" | "due" | "priority" | "manual";
export type TaskListOrder = "asc" | "desc";

export interface TaskListParams {
  status: TaskListStatus;
  categoryId?: string;
  due?: TaskListDue;
  q?: string;
  sort: TaskListSort;
  order: TaskListOrder;
  limit: number;
  cursor?: string;
}

export interface TaskListResult {
  items: Task[];
  nextCursor: string | null;
}
