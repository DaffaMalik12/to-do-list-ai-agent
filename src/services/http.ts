"use client";

/**
 * Entry point integrasi API global.
 * Wrapper fetch minimal yang dipakai oleh feature `api/*.client.ts`.
 *
 * Catatan arsitektur: untuk v0.1, request spesifik fitur tetap berada di
 * `src/features/tasks/api/tasks.client.ts`. Modul ini hanya menyediakan
 * konfigurasi bersama (base URL, header default, kredensial, error normalisasi)
 * agar fitur baru (categories, subtasks) tidak menduplikasi logika transport.
 */
import { getApiBaseUrl } from "@/shared/config/env";

/** Bentuk error standar dari server: `{ error: { code, message, details? } }`. */
export interface NormalizedApiError {
  message: string;
  code: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Bangun URL absolut ke API berdasarkan `NEXT_PUBLIC_API_BASE_URL`. */
export function resolveApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

/**
 * Tentukan mode kredensial berdasarkan apakah base URL bersifat absolut
 * (cross-origin) atau same-origin.
 *
 * Alasan: `credentials: "same-origin"` TIDAK mengirim cookie lintas origin,
 * sehingga bila `NEXT_PUBLIC_API_BASE_URL` diisi ke domain backend terpisah
 * dan autentikasi nanti memakai cookie/session, sesi akan terputus.
 *
 * Aturan default:
 * - Same-origin (base URL kosong): `"same-origin"` — aman & sesuai kebiasaan fetch.
 * - Cross-origin (base URL absolut): `"include"` — agar cookie ikut terkirim.
 *
 * Dapat di-override eksplisit lewat `init.credentials`.
 */
function resolveCredentials(base: string, override?: RequestCredentials): RequestCredentials {
  if (override) return override;
  return base.length > 0 ? "include" : "same-origin";
}

export interface ApiFetchOptions extends RequestInit {
  /** Override mode credentials. Default: "same-origin" (base kosong) atau "include" (base absolut). */
  credentials?: RequestCredentials;
}

/**
 * Panggil endpoint API dengan header JSON standar.
 * Melempar `ApiError` bila respons tidak ok; `message` diambil dari body
 * error server sehingga bisa langsung ditampilkan pada toast.
 */
export async function apiFetch(
  path: string,
  init: ApiFetchOptions = {},
): Promise<Response> {
  const base = getApiBaseUrl();
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    credentials: resolveCredentials(base, init.credentials),
  });

  if (!response.ok) {
    throw await normalizeErrorResponse(response);
  }

  return response;
}

/** Ubah body error server menjadi `ApiError` yang siap ditampilkan. */
export async function normalizeErrorResponse(
  response: Response,
): Promise<ApiError> {
  let message = "Terjadi kesalahan saat menghubungi server.";
  let code = "UNKNOWN";
  let details: unknown;

  try {
    const payload = (await response.json()) as Partial<NormalizedApiError> & {
      error?: Partial<NormalizedApiError>;
    };
    const nested = payload?.error;
    if (nested && typeof nested.message === "string") {
      message = nested.message;
      code = typeof nested.code === "string" ? nested.code : code;
      details = nested.details;
    }
  } catch {
    /* body bukan JSON — pertahankan pesan default. */
  }

  return new ApiError(message, response.status, code, details);
}
