
export interface TaskSummary {
  total: number;
  done: number;
}


export interface Task {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: string | null;
  categoryId?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;

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

/**
 * Nilai `sort` yang diterima backend (lihat `docs/api.md` §3 — kontrak tiket
 * backend). Nilai di bawah ini adalah SATU-SATUNYA nilai yang boleh dikirim;
 * jangan menambah nilai non-kontrak (mis. "completedAt", "title") tanpa
 * persetujuan backend — akan menyebabkan 400 VALIDATION_ERROR.
 */
export type TaskListSort = "created" | "due" | "priority" | "manual";
export type TaskListStatus = "all" | "active" | "completed";
export type TaskListDue = "today" | "overdue";
export type TaskListOrder = "asc" | "desc";

export interface TaskListParams {
  status?: TaskListStatus;
  categoryId?: string;
  due?: TaskListDue;
  q?: string;
  sort?: TaskListSort;
  order?: TaskListOrder;
  limit?: number;
  cursor?: string | null;
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

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  categoryId?: string | null;
}

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  completed?: boolean;
};

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
