import { httpRequest } from "@/services/http";
import type { TaskListQuery, TaskListResult } from "../types/task";

const MAX_LIMIT = 100;

/**
 * Merakit query string sesuai kontrak backend (VO-6).
 *
 * Keputusan sadar:
 * - `status` dikirim bila ada nilai, termasuk `"all"` — kontrak menyebut
 *   `status=<all|active|completed>` bagian eksplisit request. Tidak ada
 *   fallback: bila backend menolak, itu bug backend dan harus terlihat.
 * - `q` di-trim; keyword kosong (hanya spasi) dibuang.
 * - `q` TIDAK di-pre-encode manual; `URLSearchParams` melakukan encode
 *   otomatis (spasi → `+`, `%` → `%25`, dst) sehingga aman dan tepat sekali.
 * - `limit` dikirim bila diberi angka (di-clamp 1..100).
 * - `cursor` dikirim hanya bila string non-empty.
 *
 * `buildQueryString` diekspor agar dapat diuji unit tanpa `fetch`.
 */
export function buildQueryString(query: TaskListQuery): string {
  const params = new URLSearchParams();

  if (typeof query.q === "string") {
    const trimmed = query.q.trim();
    if (trimmed.length > 0) {
      params.set("q", trimmed);
    }
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.sort) {
    params.set("sort", query.sort);
  }

  if (query.order) {
    params.set("order", query.order);
  }

  if (typeof query.limit === "number" && Number.isFinite(query.limit)) {
    const limit = Math.min(Math.max(Math.floor(query.limit), 1), MAX_LIMIT);
    params.set("limit", String(limit));
  }

  if (typeof query.cursor === "string" && query.cursor.length > 0) {
    params.set("cursor", query.cursor);
  }

  // Urutkan deterministik (cursor, limit, order, q, sort, status) agar mudah
  // diverifikasi di DevTools Network.
  params.sort();

  return params.toString();
}

export async function listTasks(
  query: TaskListQuery = {},
  signal?: AbortSignal,
): Promise<TaskListResult> {
  const queryString = buildQueryString(query);
  const path = queryString ? `/api/tasks?${queryString}` : "/api/tasks";

  return httpRequest<TaskListResult>(path, { method: "GET", signal });
}
