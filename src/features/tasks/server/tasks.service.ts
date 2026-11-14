import "server-only";

import { randomUUID } from "node:crypto";
import {
  DEFAULT_CATEGORY_ID,
  MAX_TOTAL_TASKS,
  POSITION_STEP,
} from "../../../../config/database.constants";
import { ApiError } from "@/shared/http/api-response";
import type {
  CreateTaskPayload,
  TaskListQuery,
  UpdateTaskPayload,
} from "@/features/tasks/model/task.schema";
import type { Task, TaskListResult } from "@/features/tasks/model/task.types";
import * as repository from "@/features/tasks/server/tasks.repository";

/**
 * LAYER 2 — logika bisnis fitur tasks.
 * Tidak menyentuh HTTP maupun query mentah.
 */
export const tasksService = {
  list(query: TaskListQuery): TaskListResult {
    return repository.listTasks({
      status: query.status,
      categoryId: query.categoryId,
      due: query.due,
      q: query.q,
      sort: query.sort,
      order: query.order,
      limit: query.limit,
      cursor: query.cursor,
    });
  },

  create(payload: CreateTaskPayload): Task {
    const categoryId = payload.categoryId || DEFAULT_CATEGORY_ID;

    const now = new Date().toISOString();

    // Seluruh cek + insert dijalankan ATOMIK di dalam transaksi IMMEDIATE,
    // sehingga tidak ada race condition antara batas 5.000, `max(position)`,
    // dan penulisan baris (lihat `insertTaskAtomically` di repository).
    const result = repository.insertTaskAtomically({
      id: randomUUID(),
      title: payload.title,
      description:
        payload.description && payload.description.length > 0
          ? payload.description
          : null,
      priority: payload.priority,
      dueDate: payload.dueDate ?? null,
      categoryId,
      positionStep: POSITION_STEP,
      now,
      maxTotal: MAX_TOTAL_TASKS,
    });

    if (result.kind === "category_missing") {
      throw ApiError.notFound("Kategori tidak ditemukan.");
    }

    if (result.kind === "limit_reached") {
      throw ApiError.conflict(
        `Batas maksimum ${MAX_TOTAL_TASKS} tugas tercapai. Hapus beberapa tugas terlebih dahulu.`,
      );
    }

    return result.task;
  },

  update(id: string, payload: UpdateTaskPayload): Task {
    if (!repository.findActiveTaskId(id)) {
      throw ApiError.notFound("Tugas tidak ditemukan.");
    }

    if (payload.categoryId && !repository.categoryExists(payload.categoryId)) {
      throw ApiError.notFound("Kategori tidak ditemukan.");
    }

    const now = new Date().toISOString();

    const updated = repository.updateTaskById(id, {
      title: payload.title,
      description:
        payload.description === undefined
          ? undefined
          : payload.description !== null && payload.description.length > 0
            ? payload.description
            : null,
      priority: payload.priority,
      dueDate: payload.dueDate,
      categoryId: payload.categoryId,
      completed: payload.completed,
      completedAt:
        payload.completed === undefined
          ? undefined
          : payload.completed
            ? now
            : null,
      now,
    });

    if (!updated) {
      throw ApiError.notFound("Tugas tidak ditemukan.");
    }

    return updated;
  },

  getById(id: string): Task {
    const task = repository.findTaskById(id);
    if (!task) {
      throw ApiError.notFound("Tugas tidak ditemukan.");
    }
    return task;
  },

  remove(id: string): void {
    if (!repository.findActiveTaskId(id)) {
      throw ApiError.notFound("Tugas tidak ditemukan.");
    }

    if (!repository.softDeleteTaskById(id, new Date().toISOString())) {
      throw ApiError.notFound("Tugas tidak ditemukan.");
    }
  },
};
