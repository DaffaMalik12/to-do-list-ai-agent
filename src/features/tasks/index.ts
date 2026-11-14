/**
 * Public API client-safe untuk fitur tasks.
 * PENTING: jangan pernah mengekspor apa pun dari `server/` di sini.
 *
 * Catatan bundle: `tasksClient` memang mengimpor `model/task.schema.ts`
 * (Zod) untuk memvalidasi respons API sebelum masuk cache TanStack Query.
 * Itu disengaja — batas yang dijaga di sini adalah client/server, bukan
 * ada/tidaknya Zod di bundle.
 */
export { TasksPage } from "@/features/tasks/components/TasksPage";
export { QuickAddInput } from "@/features/tasks/components/QuickAddInput";
export { TaskItem } from "@/features/tasks/components/TaskItem";
export { TaskList } from "@/features/tasks/components/TaskList";
export { TaskGroup } from "@/features/tasks/components/TaskGroup";
export { TaskListSkeleton } from "@/features/tasks/components/TaskListSkeleton";

export { useTasks } from "@/features/tasks/hooks/useTasks";
export { useCreateTask } from "@/features/tasks/hooks/useCreateTask";
export { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask";
export { useDeleteTask } from "@/features/tasks/hooks/useDeleteTask";

export { tasksClient, ApiError } from "@/features/tasks/api/tasks.client";

export type {
  Task,
  TaskPriority,
  TaskSummary,
  TaskListParams,
  TaskListResult,
  CreateTaskInput,
  UpdateTaskInput,
} from "@/features/tasks/model/task.types";
