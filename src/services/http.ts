export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ApiErrorDetail[];

  constructor(
    code: string,
    message: string,
    status: number,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface SuccessEnvelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

const DEFAULT_BASE_URL = "";

/** Timeout default request (ms). Set `0` untuk menonaktifkan. */
export const DEFAULT_TIMEOUT_MS = 15_000;

export function getBaseUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase && envBase.trim().length > 0) {
    return envBase.replace(/\/$/, "");
  }
  return DEFAULT_BASE_URL;
}

export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  signal?: AbortSignal;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

interface CombinedSignal {
  signal: AbortSignal;
  /** `true` bila yang memicu abort adalah timeout internal, bukan pemanggil. */
  didTimeout: () => boolean;
  cleanup: () => void;
}

/**
 * Menggabungkan signal pemanggil dengan timeout internal.
 *
 * Prioritas abort (deterministik): **abort dari pemanggil selalu menang**.
 * - Bila `userSignal` sudah aborted saat masuk, controller langsung di-abort
 *   dan tidak ada timer yang dipasang.
 * - Bila user abort terjadi lebih dulu, `timedOut` tetap `false` sehingga
 *   `didTimeout()` mengembalikan `false` — pemanggil menerima `AbortError`
 *   apa adanya, bukan `ApiError("TIMEOUT")`.
 * - Bila keduanya terpicu bersamaan, listener user abort yang lebih dulu
 *   dieksekusi (didaftarkan sebelum timer) dan menandai `userAborted`.
 */
function createCombinedSignal(
  userSignal: AbortSignal | undefined,
  timeoutMs: number,
): CombinedSignal {
  const controller = new AbortController();

  let timedOut = false;
  let userAborted = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const onUserAbort = (): void => {
    userAborted = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!controller.signal.aborted) {
      controller.abort();
    }
  };

  const alreadyAborted = Boolean(userSignal?.aborted);
  if (userSignal) {
    if (alreadyAborted) {
      userAborted = true;
      controller.abort();
    } else {
      // Listener dipasang sebelum timer agar prioritasnya lebih tinggi.
      userSignal.addEventListener("abort", onUserAbort, { once: true });
    }
  }

  if (!controller.signal.aborted && timeoutMs > 0) {
    timer = setTimeout(() => {
      timer = null;
      if (userAborted || controller.signal.aborted) return;
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  const cleanup = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (userSignal) {
      userSignal.removeEventListener("abort", onUserAbort);
    }
  };

  return {
    signal: controller.signal,
    didTimeout: () => timedOut && !userAborted,
    cleanup,
  };
}

export async function httpRequest<T>(
  path: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    signal: userSignal,
    headers,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const url = `${getBaseUrl()}${path}`;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  let requestBody: string | undefined;
  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const combined = createCombinedSignal(userSignal, timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: requestBody,
      signal: combined.signal,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Bila abort berasal dari timeout (bukan dari pemanggil), map ke ApiError
      // yang ramah pengguna. Abort pemanggil diteruskan apa adanya agar
      // pembatalan race condition pencarian tidak disalahartikan sebagai error.
      if (combined.didTimeout()) {
        throw new ApiError(
          "TIMEOUT",
          "Permintaan melebihi batas waktu. Periksa koneksi Anda dan coba lagi.",
          0,
        );
      }
      throw err;
    }
    throw new ApiError(
      "NETWORK_ERROR",
      "Gagal terhubung ke server. Periksa koneksi Anda dan coba lagi.",
      0,
    );
  } finally {
    combined.cleanup();
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorEnvelope = payload as ErrorEnvelope | null;
    if (errorEnvelope && typeof errorEnvelope === "object" && errorEnvelope.error) {
      throw new ApiError(
        errorEnvelope.error.code ?? "UNKNOWN_ERROR",
        errorEnvelope.error.message ?? "Terjadi kesalahan pada server.",
        response.status,
        errorEnvelope.error.details,
      );
    }
    throw new ApiError(
      "HTTP_ERROR",
      `Permintaan gagal dengan status ${response.status}.`,
      response.status,
    );
  }

  const successEnvelope = payload as SuccessEnvelope<T> | null;
  if (
    !successEnvelope ||
    typeof successEnvelope !== "object" ||
    !("data" in successEnvelope)
  ) {
    throw new ApiError(
      "INVALID_RESPONSE",
      "Format respons server tidak dikenali.",
      response.status,
    );
  }

  return successEnvelope.data;
}
