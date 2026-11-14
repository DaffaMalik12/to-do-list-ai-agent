import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  isNull,
  like,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/shared/db/client";
import { categories } from "@/features/categories/model/category.table";
import { tasks, type TaskRow } from "@/features/tasks/model/task.table";
import type {
  Task,
  TaskListParams,
  TaskListResult,
} from "@/features/tasks/model/task.types";

/**
 * LAYER 3 — satu-satunya modul yang menyentuh tabel `tasks`.
 * Seluruh query memakai prepared statement/ORM (tidak ada string SQL yang dirakit
 * dari input pengguna).
 *
 * `subtaskSummary` & `checklistSummary` diisi lewat subquery konstan (0) sampai
 * tabel subtasks/checklists tersedia. Karena bentuk projection & join sudah
 * siap, penambahan fitur cukup mengganti ekspresi subquery ini dengan LEFT JOIN
 * tanpa mengubah kontrak response (lihat `docs/api.md` §2.3).
 *
 * CATATAN: file ini TIDAK meng-export fungsi mati. Bila butuh query baru,
 * tambahkan di sini + service yang relevan.
 */

function rankedPriorityExpression() {
  return sql<number>`case ${tasks.priority} when 'high' then 1 when 'medium' then 2 else 3 end`;
}

interface TaskProjection {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  categoryId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  subtaskTotal: number;
  subtaskDone: number;
  checklistTotal: number;
  checklistDone: number;
}

function toTask(row: TaskProjection): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    completed: Boolean(row.completed),
    priority: row.priority,
    dueDate: row.dueDate ?? null,
    categoryId: row.categoryId,
    position: Number(row.position),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt ?? null,
    subtaskSummary: {
      total: Number(row.subtaskTotal),
      done: Number(row.subtaskDone),
    },
    checklistSummary: {
      total: Number(row.checklistTotal),
      done: Number(row.checklistDone),
    },
  };
}

/**
 * Projection dasar untuk setiap query list/get.
 * Mengembalikan slot subquery subtask & checklist (const 0 untuk MVP);
 * ganti ekspresi ini dengan LEFT JOIN saat tabel tersedia — kontrak tidak
 * berubah, jadi tidak perlu refactor besar nanti.
 */
function baseSelection() {
  return {
    id: tasks.id,
    title: tasks.title,
    description: tasks.description,
    completed: tasks.completed,
    priority: tasks.priority,
    dueDate: tasks.dueDate,
    categoryId: tasks.categoryId,
    position: tasks.position,
    createdAt: tasks.createdAt,
    updatedAt: tasks.updatedAt,
    completedAt: tasks.completedAt,
    subtaskTotal: sql<number>`0`,
    subtaskDone: sql<number>`0`,
    checklistTotal: sql<number>`0`,
    checklistDone: sql<number>`0`,
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ambil tugas berdasarkan id (hanya yang belum soft-deleted). */
export function findTaskById(id: string): Task | null {
  const { db } = getDb();
  const row = db
    .select(baseSelection())
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .get();

  return row ? toTask(row as TaskProjection) : null;
}

/** Ambil baris mentah berdasarkan id (termasuk yang sudah soft-deleted). */
export function findTaskRowById(id: string): TaskRow | null {
  const { db } = getDb();
  const row = db.select().from(tasks).where(eq(tasks.id, id)).get();
  return (row as TaskRow | undefined) ?? null;
}

/** Cek keberadaan kategori (validasi FK sebelum insert/update). */
export function categoryExists(id: string): boolean {
  const { db } = getDb();
  const row = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .get();
  return Boolean(row);
}

/** Nilai `position` maksimum pada tugas aktif (0 bila kosong). */
export function getMaxPosition(): number {
  const { db } = getDb();
  const row = db
    .select({ maxPosition: sql<number | null>`max(${tasks.position})` })
    .from(tasks)
    .where(isNull(tasks.deletedAt))
    .get();
  return Number(row?.maxPosition ?? 0);
}

export interface InsertTaskInput {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  categoryId: string;
  /** Jeda antar posisi (`POSITION_STEP` dari constants). */
  positionStep: number;
  now: string;
  maxTotal: number;
}

export type InsertTaskResult =
  | { kind: "created"; task: Task }
  | { kind: "category_missing" }
  | { kind: "limit_reached" };

/**
 * Insert tugas baru secara atomik dalam SATU transaksi IMMEDIATE.
 *
 * Dipakai untuk menutup race condition:
 * - dua request paralel tidak bisa melewati batas `maxTotal`;
 * - dua request paralel tidak bisa mendapat `position` yang sama karena
 *   `max(position)` dihitung di dalam transaksi yang sama dengan insert.
 *
 * `IMMEDIATE` memaksa SQLite mengambil write lock di awal, sehingga
 * serialisasi transaksi dijamin (bukan deferred yang baru mengunci saat write).
 */
export function insertTaskAtomically(
  input: InsertTaskInput,
): InsertTaskResult {
  const { db, sqlite } = getDb();

  // Transaksi `IMMEDIATE` — semua pembacaan di dalamnya melihat snapshot
  // yang konsisten dan menahan write lock sampai commit.
  const txFn = sqlite.transaction((): InsertTaskResult => {
    // 1. Validasi kategori.
    const category = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .get();
    if (!category) {
      return { kind: "category_missing" };
    }

    // 2. Cek batas total (di dalam transaksi).
    const countRow = db
      .select({ total: sql<number>`count(*)` })
      .from(tasks)
      .where(isNull(tasks.deletedAt))
      .get();
    const total = Number(countRow?.total ?? 0);
    if (total >= input.maxTotal) {
      return { kind: "limit_reached" };
    }

    // 3. Hitung posisi (di dalam transaksi).
    const maxRow = db
      .select({ maxPosition: sql<number | null>`max(${tasks.position})` })
      .from(tasks)
      .where(isNull(tasks.deletedAt))
      .get();
    const maxPosition = Number(maxRow?.maxPosition ?? 0);
    const nextPosition = maxPosition + input.positionStep;

    // 4. Insert.
    db.insert(tasks)
      .values({
        id: input.id,
        title: input.title,
        description: input.description,
        completed: false,
        priority: input.priority,
        dueDate: input.dueDate,
        categoryId: input.categoryId,
        position: nextPosition,
        createdAt: input.now,
        updatedAt: input.now,
        completedAt: null,
        deletedAt: null,
      })
      .run();

    // 5. Baca kembali untuk response lengkap (projection tetap sama).
    const inserted = db
      .select(baseSelection())
      .from(tasks)
      .where(eq(tasks.id, input.id))
      .get();

    if (!inserted) {
      throw new Error("Gagal membuat tugas.");
    }

    return { kind: "created", task: toTask(inserted as TaskProjection) };
  });

  // `IMMEDIATE` mengambil write lock di awal transaksi sehingga serialisasi
  // antar request paralel dijamin walau dua request masuk hampir bersamaan.
  return txFn.immediate() as InsertTaskResult;
}

export interface UpdateTaskPatch {
  title?: string;
  description?: string | null;
  priority?: "low" | "medium" | "high";
  dueDate?: string | null;
  categoryId?: string;
  completed?: boolean;
  completedAt?: string | null;
  now: string;
}

/** Update sebagian field tugas yang belum dihapus. */
export function updateTaskById(id: string, patch: UpdateTaskPatch): Task | null {
  const { db } = getDb();

  const updated = db.transaction((tx) => {
    const values: Record<string, unknown> = { updatedAt: patch.now };
    if (patch.title !== undefined) values.title = patch.title;
    if (patch.description !== undefined) values.description = patch.description;
    if (patch.priority !== undefined) values.priority = patch.priority;
    if (patch.dueDate !== undefined) values.dueDate = patch.dueDate;
    if (patch.categoryId !== undefined) values.categoryId = patch.categoryId;
    if (patch.completed !== undefined) values.completed = patch.completed;
    if (patch.completedAt !== undefined) values.completedAt = patch.completedAt;

    tx.update(tasks)
      .set(values)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .run();

    return tx
      .select(baseSelection())
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .get();
  });

  return updated ? toTask(updated as TaskProjection) : null;
}

/** Soft delete tugas. Mengembalikan `true` bila ada baris terpengaruh. */
export function softDeleteTaskById(id: string, now: string): boolean {
  const { db } = getDb();
  const result = db
    .update(tasks)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .run();
  return result.changes > 0;
}

/** Cek keberadaan tugas aktif (belum deleted). */
export function findActiveTaskId(id: string): string | null {
  const { db } = getDb();
  const row = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .get();
  return row?.id ?? null;
}

function orderByClause(params: TaskListParams) {
  switch (params.sort) {
    case "priority": {
      const rank = rankedPriorityExpression();
      return params.order === "asc"
        ? [asc(rank), asc(tasks.createdAt), asc(tasks.id)]
        : [desc(rank), desc(tasks.createdAt), asc(tasks.id)];
    }
    case "due": {
      // `null` due_date selalu di paling akhir pada asc, di paling awal desc.
      const column = sql`coalesce(${tasks.dueDate}, '9999-12-31')`;
      return params.order === "asc"
        ? [asc(column), asc(tasks.id)]
        : [desc(column), asc(tasks.id)];
    }
    case "manual":
      // Urut berdasarkan posisi manual (drag-and-drop / QuickAdd).
      return params.order === "asc"
        ? [asc(tasks.position), asc(tasks.id)]
        : [desc(tasks.position), asc(tasks.id)];
    case "created":
    default:
      // Kontrak: sort `created` = `created_at` (bukan `position`).
      return params.order === "asc"
        ? [asc(tasks.createdAt), asc(tasks.id)]
        : [desc(tasks.createdAt), asc(tasks.id)];
  }
}

/** Bandingkan pasangan (sortKey, id) untuk keyset pagination. */
function cursorCondition(
  params: TaskListParams,
  cursor: { key: string; id: string },
) {
  switch (params.sort) {
    case "priority": {
      const rank = Number(cursor.key);
      if (!Number.isFinite(rank)) return undefined;
      const rankExpr = rankedPriorityExpression();
      return params.order === "asc"
        ? or(gt(rankExpr, rank), and(eq(rankExpr, rank), gt(tasks.id, cursor.id)))
        : or(lt(rankExpr, rank), and(eq(rankExpr, rank), lt(tasks.id, cursor.id)));
    }
    case "due": {
      const column = sql`coalesce(${tasks.dueDate}, '9999-12-31')`;
      return params.order === "asc"
        ? or(gt(column, cursor.key), and(eq(column, cursor.key), gt(tasks.id, cursor.id)))
        : or(lt(column, cursor.key), and(eq(column, cursor.key), lt(tasks.id, cursor.id)));
    }
    case "manual": {
      const position = Number(cursor.key);
      if (!Number.isFinite(position)) return undefined;
      return params.order === "asc"
        ? or(
            gt(tasks.position, position),
            and(eq(tasks.position, position), gt(tasks.id, cursor.id)),
          )
        : or(
            lt(tasks.position, position),
            and(eq(tasks.position, position), lt(tasks.id, cursor.id)),
          );
    }
    case "created":
    default: {
      // Keyset pada `created_at` (ISO-8601 lexicographic-safe).
      const createdAt = cursor.key;
      return params.order === "asc"
        ? or(
            gt(tasks.createdAt, createdAt),
            and(eq(tasks.createdAt, createdAt), gt(tasks.id, cursor.id)),
          )
        : or(
            lt(tasks.createdAt, createdAt),
            and(eq(tasks.createdAt, createdAt), lt(tasks.id, cursor.id)),
          );
    }
  }
}

/** Nilai sortKey sebuah tugas sesuai opsi `sort` (dipakai membentuk cursor). */
export function taskSortKey(task: Task, sort: TaskListParams["sort"]): string {
  switch (sort) {
    case "priority":
      return String(task.priority === "high" ? 1 : task.priority === "medium" ? 2 : 3);
    case "due":
      return task.dueDate ?? "9999-12-31";
    case "manual":
      return String(task.position);
    case "created":
    default:
      return task.createdAt;
  }
}

/** Escape wildcard LIKE dari input pengguna agar diperlakukan literal. */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** Query daftar tugas dengan filter, pencarian, dan keyset pagination. */
export function listTasks(params: TaskListParams): TaskListResult {
  const { db } = getDb();

  const conditions = [isNull(tasks.deletedAt)];

  if (params.status === "active") {
    conditions.push(eq(tasks.completed, false));
  } else if (params.status === "completed") {
    conditions.push(eq(tasks.completed, true));
  }

  if (params.categoryId) {
    conditions.push(eq(tasks.categoryId, params.categoryId));
  }

  if (params.due === "today") {
    conditions.push(eq(tasks.dueDate, todayIso()));
  } else if (params.due === "overdue") {
    conditions.push(
      and(lte(tasks.dueDate, todayIso()), eq(tasks.completed, false))!,
    );
  }

  if (params.q) {
    // Escape `%`, `_`, `\` lalu pakai `ESCAPE '\'` agar pencarian literal.
    // `coalesce(description, '')` memastikan nilai `NULL` tidak "menelan" hasil
    // (LIKE pada NULL mengembalikan NULL, bukan false).
    const pattern = `%${escapeLike(params.q)}%`;
    const titleMatch = sql`${tasks.title} LIKE ${pattern} ESCAPE '\\'`;
    const descriptionMatch = sql`coalesce(${tasks.description}, '') LIKE ${pattern} ESCAPE '\\'`;
    conditions.push(or(titleMatch, descriptionMatch)!);
  }

  if (params.cursor) {
    const separatorIndex = params.cursor.lastIndexOf("~");
    if (separatorIndex > 0) {
      const key = params.cursor.slice(0, separatorIndex);
      const id = params.cursor.slice(separatorIndex + 1);
      const condition = cursorCondition(params, { key, id });
      if (condition) conditions.push(condition);
    }
  }

  const rows = db
    .select(baseSelection())
    .from(tasks)
    .where(and(...conditions))
    .orderBy(...orderByClause(params))
    .limit(params.limit + 1)
    .all();

  const hasMore = rows.length > params.limit;
  const pageRows = (hasMore ? rows.slice(0, params.limit) : rows) as TaskProjection[];
  const items = pageRows.map(toTask);

  // Tidak memakai `Array.prototype.at` agar kompatibel dengan target/lib lama.
  const last = items.length > 0 ? items[items.length - 1] : undefined;
  const nextCursor =
    hasMore && last ? `${taskSortKey(last, params.sort)}~${last.id}` : null;

  return { items, nextCursor };
}
