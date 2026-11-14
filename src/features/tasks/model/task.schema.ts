import { z } from "zod";
import type { Task, TaskPriority } from "@/features/tasks/model/task.types";

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export const taskSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  completed: z.boolean(),
  priority: taskPrioritySchema,
  dueDate: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  subtaskSummary: taskSummarySchema,
  checklistSummary: taskSummarySchema,
});

export const taskListResponseSchema = z.object({
  data: z.object({
    items: z.array(taskSchema),
    nextCursor: z.string().nullable(),
  }),
});

export const taskResponseSchema = z.object({
  data: taskSchema,
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

/** Input form QuickAdd — trim judul, tolak kosong. */
export const quickAddSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul tugas tidak boleh kosong.")
    .max(200, "Judul tugas maksimal 200 karakter."),
});

/** Input edit inline — trim, tolak kosong. */
export const inlineEditSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul tugas tidak boleh kosong.")
    .max(200, "Judul tugas maksimal 200 karakter."),
});

export type QuickAddValues = z.infer<typeof quickAddSchema>;
export type InlineEditValues = z.infer<typeof inlineEditSchema>;

export function isTask(value: unknown): value is Task {
  return taskSchema.safeParse(value).success;
}

export function parseTask(value: unknown): Task {
  return taskSchema.parse(value) as Task;
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return taskPrioritySchema.safeParse(value).success;
}
