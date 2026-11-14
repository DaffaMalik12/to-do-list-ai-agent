import { AppError } from "@/utils/app-error";
import { encodeCursor } from "@/utils/cursor";
import { toContainsPattern, toPrefixPattern } from "@/utils/sql";
import type { CreateTaskInput, Task, TaskListQuery, TaskListResult, UpdateTaskInput } from "../types";
import * as tasksRepository from "./tasks.repository";
import type { TaskSearchPatterns } from "./tasks.repository";

/**
 * Layer 2: logika bisnis pencarian.
 * Pattern LIKE dibentuk di sini (escape wildcard + lower-case) sehingga
 * repository hanya menerima nilai siap-bind.
 */
function buildSearchPatterns(keyword?: string): TaskSearchPatterns | null {
  if (!keyword) return null;

  const normalized = keyword.toLowerCase();
  return {
    contains: toContainsPattern(normalized),
    prefix: toPrefixPattern(normalized),
  };
}

export async function listTasks(query: TaskListQuery): Promise<TaskListResult> {
  const search = buildSearchPatterns(query.q);

  // Ambil limit + 1 untuk mengetahui apakah masih ada halaman berikutnya
  // tanpa query COUNT terpisah.
  const rows = tasksRepository.listTasks({
    status: query.status,
    categoryId: query.categoryId,
    due: query.due,
    search,
    sort: query.sort,
    order: query.order,
    limit: query.limit + 1,
    offset: query.offset,
  });

  const hasMore = rows.length > query.limit;
  const items = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    items,
    nextCursor: hasMore ? encodeCursor(query.offset + query.limit) : null,
  };
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return tasksRepository.insertTask(input);
}

export async function getTaskById(id: string): Promise<Task> {
  const task = tasksRepository.findTaskById(id);
  if (!task) throw AppError.notFound("Tugas tidak ditemukan");
  return task;
}

export async function updateTaskById(id: string, patch: UpdateTaskInput): Promise<Task> {
  const updated = tasksRepository.updateTask(id, patch);
  if (!updated) throw AppError.notFound("Tugas tidak ditemukan");
  return updated;
}

export async function deleteTaskById(id: string): Promise<void> {
  const deleted = tasksRepository.softDeleteTask(id);
  if (!deleted) throw AppError.notFound("Tugas tidak ditemukan");
}
