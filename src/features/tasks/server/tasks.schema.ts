import type { ErrorDetail } from "@/utils/app-error";
import { decodeCursor } from "@/utils/cursor";
import type {
  CreateTaskInput,
  TaskDueFilter,
  TaskListQuery,
  TaskOrder,
  TaskPriority,
  TaskSort,
  TaskStatus,
  TaskStatusFilter,
  UpdateTaskInput,
} from "../types";

export const MAX_KEYWORD_LENGTH = 200;
export const MAX_CATEGORY_ID_LENGTH = 100;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_CURSOR_LENGTH = 512;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

const STATUS_FILTERS = ["all", "active", "completed"] as const;
const DUE_FILTERS = ["today", "overdue"] as const;
const SORT_VALUES = ["created", "due", "priority", "manual"] as const;
const ORDER_VALUES = ["asc", "desc"] as const;
const TASK_STATUSES = ["active", "completed"] as const;
const TASK_PRIORITIES = ["low", "medium", "high"] as const;

const TASK_ID_PATTERN = /^[0-9a-zA-Z-]{1,64}$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Input yang hanya berisi wildcard LIKE / escape char tidak boleh menjadi
 * filter (setelah di-escape tidak ada karakter literal yang dicari), sehingga
 * `q=%`, `q=%%%`, atau `q=\` diperlakukan sama seperti tanpa `q`.
 */
const WILDCARD_ONLY_PATTERN = /^[%_\\]+$/;

export type ParseResult<T> = { success: true; data: T } | { success: false; details: ErrorDetail[] };

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidTaskId(value: string): boolean {
  return TASK_ID_PATTERN.test(value);
}

function parseEnumParam<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): { value: T } | { error: string } {
  if (raw === null) return { value: fallback };
  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0) return { value: fallback };
  if (!isOneOf(normalized, allowed)) {
    return { error: `nilai harus salah satu dari: ${allowed.join(", ")}` };
  }
  return { value: normalized };
}

function parseOptionalEnumParam<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): { value?: T } | { error: string } {
  if (raw === null) return {};
  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0) return {};
  if (!isOneOf(normalized, allowed)) {
    return { error: `nilai harus salah satu dari: ${allowed.join(", ")}` };
  }
  return { value: normalized };
}

function normalizeKeyword(raw: string | null): { value?: string } | { error: string } {
  if (raw === null) return {};

  const trimmed = raw.trim();
  if (trimmed.length > MAX_KEYWORD_LENGTH) {
    return { error: `q maksimal ${MAX_KEYWORD_LENGTH} karakter` };
  }
  if (trimmed.length === 0) return {};
  if (WILDCARD_ONLY_PATTERN.test(trimmed)) return {};

  return { value: trimmed };
}

/**
 * Layer validasi untuk `GET /api/tasks`.
 * Semua normalisasi `q` (trim, batas panjang, wildcard-only) terjadi di sini
 * agar handler & service menerima nilai yang sudah bersih.
 */
export function parseTaskListQuery(searchParams: URLSearchParams): ParseResult<TaskListQuery> {
  const details: ErrorDetail[] = [];

  const keyword = normalizeKeyword(searchParams.get("q"));
  if ("error" in keyword) details.push({ path: "q", message: keyword.error });

  const status = parseEnumParam<TaskStatusFilter>(searchParams.get("status"), STATUS_FILTERS, "all");
  if ("error" in status) details.push({ path: "status", message: status.error });

  const due = parseOptionalEnumParam<TaskDueFilter>(searchParams.get("due"), DUE_FILTERS);
  if ("error" in due) details.push({ path: "due", message: due.error });

  const sort = parseEnumParam<TaskSort>(searchParams.get("sort"), SORT_VALUES, "created");
  if ("error" in sort) details.push({ path: "sort", message: sort.error });

  const sortValue: TaskSort = "error" in sort ? "created" : sort.value;
  const defaultOrder: TaskOrder = sortValue === "manual" ? "asc" : "desc";
  const order = parseEnumParam<TaskOrder>(searchParams.get("order"), ORDER_VALUES, defaultOrder);
  if ("error" in order) details.push({ path: "order", message: order.error });

  let categoryId: string | undefined;
  const categoryRaw = searchParams.get("categoryId");
  if (categoryRaw !== null) {
    const trimmedCategory = categoryRaw.trim();
    if (trimmedCategory.length > MAX_CATEGORY_ID_LENGTH) {
      details.push({ path: "categoryId", message: `categoryId maksimal ${MAX_CATEGORY_ID_LENGTH} karakter` });
    } else if (trimmedCategory.length > 0) {
      categoryId = trimmedCategory;
    }
  }

  let limit = DEFAULT_PAGE_LIMIT;
  const limitRaw = searchParams.get("limit");
  if (limitRaw !== null && limitRaw.trim().length > 0) {
    const trimmedLimit = limitRaw.trim();
    const parsedLimit = /^\d+$/.test(trimmedLimit) ? Number(trimmedLimit) : Number.NaN;
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_PAGE_LIMIT) {
      details.push({ path: "limit", message: `limit harus bilangan bulat antara 1 dan ${MAX_PAGE_LIMIT}` });
    } else {
      limit = parsedLimit;
    }
  }

  let offset = 0;
  const cursorRaw = searchParams.get("cursor");
  if (cursorRaw !== null && cursorRaw.trim().length > 0) {
    const trimmedCursor = cursorRaw.trim();
    const decodedOffset = trimmedCursor.length > MAX_CURSOR_LENGTH ? null : decodeCursor(trimmedCursor);
    if (decodedOffset === null) {
      details.push({ path: "cursor", message: "cursor tidak valid" });
    } else {
      offset = decodedOffset;
    }
  }

  if (details.length > 0) return { success: false, details };

  return {
    success: true,
    data: {
      q: "error" in keyword ? undefined : keyword.value,
      status: "error" in status ? "all" : status.value,
      categoryId,
      due: "error" in due ? undefined : due.value,
      sort: sortValue,
      order: "error" in order ? defaultOrder : order.value,
      limit,
      offset,
    },
  };
}

function normalizeRequiredString(
  value: unknown,
  path: string,
  maxLength: number,
  details: ErrorDetail[],
): string {
  if (typeof value !== "string") {
    details.push({ path, message: `${path} wajib berupa string` });
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    details.push({ path, message: `${path} tidak boleh kosong` });
    return "";
  }
  if (trimmed.length > maxLength) {
    details.push({ path, message: `${path} maksimal ${maxLength} karakter` });
    return "";
  }
  return trimmed;
}

function normalizeOptionalString(
  value: unknown,
  path: string,
  maxLength: number,
  details: ErrorDetail[],
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    details.push({ path, message: `${path} harus berupa string atau null` });
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    details.push({ path, message: `${path} maksimal ${maxLength} karakter` });
    return null;
  }
  return trimmed;
}

function normalizeEnum<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
  fallback: T,
  details: ErrorDetail[],
): T {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") {
    details.push({ path, message: `${path} harus berupa string` });
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return fallback;
  if (!isOneOf(normalized, allowed)) {
    details.push({ path, message: `${path} harus salah satu dari: ${allowed.join(", ")}` });
    return fallback;
  }
  return normalized;
}

function normalizeRequiredEnumPatch<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
  details: ErrorDetail[],
): T {
  if (typeof value !== "string") {
    details.push({ path, message: `${path} harus berupa string` });
    return allowed[0];
  }
  const normalized = value.trim().toLowerCase();
  if (!isOneOf(normalized, allowed)) {
    details.push({ path, message: `${path} harus salah satu dari: ${allowed.join(", ")}` });
    return allowed[0];
  }
  return normalized;
}

function normalizeDueDate(value: unknown, details: ErrorDetail[], path = "dueDate"): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    details.push({ path, message: `${path} harus berupa string tanggal ISO atau null` });
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  if (trimmed.length > 40 || Number.isNaN(Date.parse(trimmed))) {
    details.push({ path, message: `${path} harus berupa tanggal ISO yang valid (contoh: 2025-01-31)` });
    return null;
  }

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
      details.push({ path, message: `${path} bukan tanggal yang valid` });
      return null;
    }
  }

  return trimmed;
}

export function parseCreateTaskBody(payload: unknown): ParseResult<CreateTaskInput> {
  if (!isPlainObject(payload)) {
    return { success: false, details: [{ path: "body", message: "Body request harus berupa objek JSON" }] };
  }

  const details: ErrorDetail[] = [];

  const title = normalizeRequiredString(payload.title, "title", MAX_TITLE_LENGTH, details);
  const description = normalizeOptionalString(
    payload.description,
    "description",
    MAX_DESCRIPTION_LENGTH,
    details,
  );
  const status = normalizeEnum<TaskStatus>(payload.status, "status", TASK_STATUSES, "active", details);
  const priority = normalizeEnum<TaskPriority>(
    payload.priority,
    "priority",
    TASK_PRIORITIES,
    "medium",
    details,
  );
  const categoryId = normalizeOptionalString(
    payload.categoryId,
    "categoryId",
    MAX_CATEGORY_ID_LENGTH,
    details,
  );
  const dueDate = normalizeDueDate(payload.dueDate, details);

  if (details.length > 0) return { success: false, details };

  return { success: true, data: { title, description, status, priority, categoryId, dueDate } };
}

export function parseUpdateTaskBody(payload: unknown): ParseResult<UpdateTaskInput> {
  if (!isPlainObject(payload)) {
    return { success: false, details: [{ path: "body", message: "Body request harus berupa objek JSON" }] };
  }

  const details: ErrorDetail[] = [];
  const patch: UpdateTaskInput = {};
  let hasField = false;

  if ("title" in payload) {
    hasField = true;
    patch.title = normalizeRequiredString(payload.title, "title", MAX_TITLE_LENGTH, details);
  }
  if ("description" in payload) {
    hasField = true;
    patch.description = normalizeOptionalString(
      payload.description,
      "description",
      MAX_DESCRIPTION_LENGTH,
      details,
    );
  }
  if ("status" in payload) {
    hasField = true;
    patch.status = normalizeRequiredEnumPatch<TaskStatus>(payload.status, "status", TASK_STATUSES, details);
  }
  if ("priority" in payload) {
    hasField = true;
    patch.priority = normalizeRequiredEnumPatch<TaskPriority>(
      payload.priority,
      "priority",
      TASK_PRIORITIES,
      details,
    );
  }
  if ("categoryId" in payload) {
    hasField = true;
    patch.categoryId = normalizeOptionalString(
      payload.categoryId,
      "categoryId",
      MAX_CATEGORY_ID_LENGTH,
      details,
    );
  }
  if ("dueDate" in payload) {
    hasField = true;
    patch.dueDate = normalizeDueDate(payload.dueDate, details);
  }

  if (!hasField) {
    details.push({ path: "body", message: "Minimal satu field harus dikirim untuk diperbarui" });
  }

  if (details.length > 0) return { success: false, details };

  return { success: true, data: patch };
}
