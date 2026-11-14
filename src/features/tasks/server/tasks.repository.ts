import { randomUUID } from "node:crypto";
import { getDatabase } from "@/config/database";
import type {
  CreateTaskInput,
  Task,
  TaskDueFilter,
  TaskOrder,
  TaskPriority,
  TaskSort,
  TaskStatus,
  TaskStatusFilter,
  UpdateTaskInput,
} from "../types";

export interface TaskSearchPatterns {
  /** Pattern "mengandung" yang sudah di-escape + lower-case, mis. `%belanja%`. */
  contains: string;
  /** Pattern "diawali" yang sudah di-escape + lower-case, mis. `belanja%`. */
  prefix: string;
}

export interface ListTasksParams {
  status: TaskStatusFilter;
  categoryId?: string;
  due?: TaskDueFilter;
  search?: TaskSearchPatterns | null;
  sort: TaskSort;
  order: TaskOrder;
  limit: number;
  offset: number;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

const TASK_COLUMNS =
  "id, title, description, status, priority, category_id, due_date, position, created_at, updated_at";

/**
 * Catatan SQL:
 * - Semua nilai dari user masuk sebagai named parameter (tidak ada string SQL
 *   yang dirakit dari input user).
 * - `ESCAPE '\'` dipakai bersama pattern yang sudah di-escape di `src/utils/sql.ts`.
 * - `lower(kolom) LIKE lower(pattern)` membuat pencarian case-insensitive.
 * - `relevance`: 0 = title prefix, 1 = title substring, 2 = description.
 */
function buildListSql(sort: TaskSort, order: TaskOrder): string {
  return `
SELECT
  ${TASK_COLUMNS},
  CASE
    WHEN @searchContains IS NULL THEN 0
    WHEN lower(title) LIKE @searchPrefix ESCAPE '\\' THEN 0
    WHEN lower(title) LIKE @searchContains ESCAPE '\\' THEN 1
    ELSE 2
  END AS relevance
FROM tasks
WHERE deleted_at IS NULL
  AND (@status IS NULL OR status = @status)
  AND (@categoryId IS NULL OR category_id = @categoryId)
  AND (
    @due IS NULL
    OR (@due = 'today' AND due_date IS NOT NULL AND date(due_date) = date('now'))
    OR (@due = 'overdue' AND due_date IS NOT NULL AND date(due_date) < date('now'))
  )
  AND (
    @searchContains IS NULL
    OR lower(title) LIKE @searchContains ESCAPE '\\'
    OR lower(coalesce(description, '')) LIKE @searchContains ESCAPE '\\'
  )
ORDER BY relevance ASC, ${buildSortClause(sort, order)}
LIMIT @limit OFFSET @offset
`;
}

function buildSortClause(sort: TaskSort, order: TaskOrder): string {
  const direction = order === "asc" ? "ASC" : "DESC";

  switch (sort) {
    case "due":
      return `(due_date IS NULL) ASC, due_date ${direction}, id ASC`;
    case "priority":
      return `CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END ${direction}, id ASC`;
    case "manual":
      return `position ${direction}, id ASC`;
    case "created":
    default:
      return `created_at ${direction}, id ASC`;
  }
}

function mapRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    categoryId: row.category_id,
    dueDate: row.due_date,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listTasks(params: ListTasksParams): Task[] {
  const limit = Math.min(Math.max(Math.trunc(params.limit), 1), 1000);
  const offset = Math.max(Math.trunc(params.offset), 0);

  const rows = getDatabase()
    .prepare(buildListSql(params.sort, params.order))
    .all({
      status: params.status === "all" ? null : params.status,
      categoryId: params.categoryId ?? null,
      due: params.due ?? null,
      searchContains: params.search?.contains ?? null,
      searchPrefix: params.search?.prefix ?? null,
      limit,
      offset,
    }) as TaskRow[];

  return rows.map(mapRow);
}

export function findTaskById(id: string): Task | null {
  const row = getDatabase()
    .prepare(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as TaskRow | undefined;

  return row ? mapRow(row) : null;
}

export function insertTask(data: CreateTaskInput): Task {
  const database = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  const positionRow = database
    .prepare("SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM tasks")
    .get() as { next_position: number } | undefined;
  const position = positionRow && Number.isFinite(positionRow.next_position) ? positionRow.next_position : 1;

  database
    .prepare(
      `INSERT INTO tasks
        (id, title, description, status, priority, category_id, due_date, position, created_at, updated_at)
       VALUES
        (@id, @title, @description, @status, @priority, @categoryId, @dueDate, @position, @createdAt, @updatedAt)`,
    )
    .run({
      id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      categoryId: data.categoryId,
      dueDate: data.dueDate,
      position,
      createdAt: now,
      updatedAt: now,
    });

  const created = findTaskById(id);
  if (!created) {
    throw new Error("Gagal menyimpan tugas");
  }
  return created;
}

const FIELD_COLUMNS = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  categoryId: "category_id",
  dueDate: "due_date",
} as const;

type UpdateField = keyof typeof FIELD_COLUMNS;

export function updateTask(id: string, patch: UpdateTaskInput): Task | null {
  const assignments: string[] = [];
  const params: Record<string, unknown> = { id, updatedAt: new Date().toISOString() };

  for (const field of Object.keys(FIELD_COLUMNS) as UpdateField[]) {
    const value = patch[field];
    if (value === undefined) continue;
    assignments.push(`${FIELD_COLUMNS[field]} = @${field}`);
    params[field] = value;
  }

  if (assignments.length === 0) return findTaskById(id);

  assignments.push("updated_at = @updatedAt");

  const result = getDatabase()
    .prepare(`UPDATE tasks SET ${assignments.join(", ")} WHERE id = @id AND deleted_at IS NULL`)
    .run(params);

  if (result.changes === 0) return null;

  return findTaskById(id);
}

export function softDeleteTask(id: string): boolean {
  const now = new Date().toISOString();
  const result = getDatabase()
    .prepare("UPDATE tasks SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id AND deleted_at IS NULL")
    .run({ id, deletedAt: now });

  return result.changes > 0;
}
