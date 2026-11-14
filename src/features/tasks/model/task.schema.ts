import { z } from "zod";
import { DEFAULT_CATEGORY_ID } from "../../../../config/database.constants";

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;

/** Format tanggal `YYYY-MM-DD` dan harus tanggal kalender yang valid. */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const isoDateSchema = z
  .string({ invalid_type_error: "Tanggal harus berupa teks." })
  .trim()
  .regex(ISO_DATE_REGEX, "Format tanggal harus YYYY-MM-DD.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Tanggal tidak valid.");

/** Body POST /api/tasks */
export const createTaskSchema = z.object({
  title: z
    .string({
      required_error: "Judul tugas wajib diisi.",
      invalid_type_error: "Judul tugas harus berupa teks.",
    })
    .trim()
    .min(1, "Judul tugas tidak boleh kosong.")
    .max(200, "Judul tugas maksimal 200 karakter."),
  description: z
    .string({ invalid_type_error: "Deskripsi harus berupa teks." })
    .trim()
    .max(2000, "Deskripsi maksimal 2000 karakter.")
    .optional(),
  priority: taskPrioritySchema.default("medium"),
  dueDate: isoDateSchema.optional(),
  categoryId: z
    .string({ invalid_type_error: "ID kategori harus berupa teks." })
    .trim()
    .min(1, "ID kategori tidak boleh kosong.")
    .max(64, "ID kategori maksimal 64 karakter.")
    .default(DEFAULT_CATEGORY_ID),
});

/**
 * Update tugas (disiapkan untuk tiket VO-3/lanjutan).
 * VO-2 hanya memakai `createTaskSchema` & `taskListQuerySchema`.
 */
export const updateTaskSchema = createTaskSchema.partial().extend({
  completed: z
    .boolean({ invalid_type_error: "Field completed harus boolean." })
    .optional(),
});

/** Query string GET /api/tasks */
export const taskListQuerySchema = z.object({
  status: z.enum(["all", "active", "completed"]).default("all"),
  categoryId: z.string().trim().min(1).max(64).optional(),
  due: z.enum(["today", "overdue"]).optional(),
  q: z.string().trim().max(200, "Kata kunci maksimal 200 karakter.").optional(),
  sort: z.enum(["created", "due", "priority", "manual"]).default("created"),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce
    .number({ invalid_type_error: "Limit harus berupa angka." })
    .int("Limit harus bilangan bulat.")
    .min(1, "Limit minimal 1.")
    .max(200, "Limit maksimal 200.")
    .default(50),
  cursor: z.string().trim().min(1).max(256).optional(),
});

export const taskSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  priority: taskPrioritySchema,
  dueDate: z.string().nullable(),
  categoryId: z.string(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  subtaskSummary: taskSummarySchema,
  checklistSummary: taskSummarySchema,
});

export const taskListResultSchema = z.object({
  items: z.array(taskSchema),
  nextCursor: z.string().nullable(),
});

export type CreateTaskPayload = z.infer<typeof createTaskSchema>;
export type UpdateTaskPayload = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

export function isTask(value: unknown): boolean {
  return taskSchema.safeParse(value).success;
}

export function parseTask(value: unknown) {
  return taskSchema.parse(value);
}
